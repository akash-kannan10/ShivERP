import { prisma } from '../config';
import { InventoryService } from './inventoryService';

export class ProcurementService {
  /**
   * Evaluates order lines for a confirmed Sales Order and triggers MTO (Make-to-Order) 
   * manufacturing or purchase orders when inventory is insufficient.
   */
  static async checkAndTriggerProcurement(salesOrderId: string, userId: string): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch sales order with lines and customer
      const so = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          customer: true,
          lines: {
            include: {
              product: true
            }
          }
        }
      });

      if (!so) {
        throw new Error(`Sales Order ${salesOrderId} not found`);
      }

      if (so.status !== 'confirmed') {
        throw new Error(`Sales Order ${so.orderNumber} must be in "confirmed" status to process procurement`);
      }

      const results = [];

      for (const line of so.lines) {
        const product = line.product;
        const requestedQty = line.quantity;
        const freeToUse = product.onHandQty - product.reservedQty;

        if (freeToUse >= requestedQty) {
          // MTS Case: Stock is sufficient. Simply reserve the requested quantity.
          await InventoryService.recordStockMovement({
            productId: product.id,
            movementType: 'sales_reservation',
            quantityDelta: requestedQty,
            referenceType: 'sales_order',
            referenceId: so.id,
            userId
          }, tx);

          results.push({
            productId: product.id,
            action: 'RESERVE_STOCK',
            quantity: requestedQty,
            reason: `Sufficient stock available (Free to use: ${freeToUse})`
          });
        } else {
          // Shortage Case: Procurement required.
          const shortageQty = requestedQty - Math.max(0, freeToUse);
          const availableToReserve = Math.max(0, freeToUse);

          // Reserve what is currently available
          if (availableToReserve > 0) {
            await InventoryService.recordStockMovement({
              productId: product.id,
              movementType: 'sales_reservation',
              quantityDelta: availableToReserve,
              referenceType: 'sales_order',
              referenceId: so.id,
              userId
            }, tx);
          }

          // Handle Shortage procurement based on settings
          if (product.procurementType === 'manufacture') {
            // Check if default BoM exists
            if (!product.defaultBomId) {
              throw new Error(`Cannot auto-create Manufacturing Order for ${product.name}: No Bill of Materials (BoM) assigned.`);
            }

            // Create MO for shortage
            const moCount = await tx.manufacturingOrder.count();
            const moNumber = `MO-AUTO-${String(moCount + 1).padStart(4, '0')}`;

            const mo = await tx.manufacturingOrder.create({
              data: {
                orderNumber: moNumber,
                productId: product.id,
                bomId: product.defaultBomId,
                quantity: shortageQty,
                status: 'draft',
                sourceSalesOrderId: so.id,
                dueDate: so.expectedDeliveryDate,
                assigneeId: userId
              }
            });

            // Explode BoM operations to create Work Orders
            const bomOps = await tx.bomOperation.findMany({
              where: { bomId: product.defaultBomId },
              orderBy: { sequence: 'asc' }
            });

            for (const op of bomOps) {
              await tx.workOrder.create({
                data: {
                  manufacturingOrderId: mo.id,
                  operationName: op.operationName,
                  sequence: op.sequence,
                  workCenterId: op.workCenterId,
                  status: 'pending'
                }
              });
            }

            // Reserve Raw Material components needed for MO
            const bomComponents = await tx.bomComponent.findMany({
              where: { bomId: product.defaultBomId }
            });

            for (const comp of bomComponents) {
              const reqQty = comp.quantity * shortageQty;
              // Attempt to reserve raw components
              const compProduct = await tx.product.findUnique({ where: { id: comp.componentProductId } });
              if (compProduct) {
                const compFree = compProduct.onHandQty - compProduct.reservedQty;
                const reserveQty = Math.min(reqQty, Math.max(0, compFree));

                if (reserveQty > 0) {
                  await InventoryService.recordStockMovement({
                    productId: comp.componentProductId,
                    movementType: 'mo_reservation',
                    quantityDelta: reserveQty,
                    referenceType: 'manufacturing_order',
                    referenceId: mo.id,
                    userId
                  }, tx);
                }

                // If shortage of components, a Low Stock Alert is raised in recordStockMovement or verified in cron sweep
              }
            }

            // Log Audit
            await tx.auditLog.create({
              data: {
                userId,
                action: 'create',
                entityType: 'manufacturing_order',
                entityId: mo.id,
                newValue: `Auto-generated MO ${moNumber} for shortage of ${shortageQty} units of ${product.name} triggered by Sales Order ${so.orderNumber}`
              }
            });

            results.push({
              productId: product.id,
              action: 'CREATE_MANUFACTURING_ORDER',
              quantity: shortageQty,
              moId: mo.id,
              moNumber,
              reason: `Shortage of ${shortageQty} units. Triggered auto-manufacture.`
            });

          } else {
            // purchase
            const vendorId = product.defaultVendorId;
            if (!vendorId) {
              throw new Error(`Cannot auto-create Purchase Order for ${product.name}: No default vendor assigned.`);
            }

            const poCount = await tx.purchaseOrder.count();
            const poNumber = `PO-AUTO-${String(poCount + 1).padStart(4, '0')}`;

            const po = await tx.purchaseOrder.create({
              data: {
                orderNumber: poNumber,
                vendorId,
                status: 'draft',
                orderDate: new Date(),
                expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Default lead time: 5 days
                createdById: userId,
                totalAmount: product.costPrice * shortageQty,
                lines: {
                  create: [
                    {
                      productId: product.id,
                      quantity: shortageQty,
                      unitCost: product.costPrice
                    }
                  ]
                }
              }
            });

            // Log Audit
            await tx.auditLog.create({
              data: {
                userId,
                action: 'create',
                entityType: 'purchase_order',
                entityId: po.id,
                newValue: `Auto-generated PO ${poNumber} for shortage of ${shortageQty} units of ${product.name} triggered by Sales Order ${so.orderNumber}`
              }
            });

            results.push({
              productId: product.id,
              action: 'CREATE_PURCHASE_ORDER',
              quantity: shortageQty,
              poId: po.id,
              poNumber,
              reason: `Shortage of ${shortageQty} units. Triggered auto-purchase from Vendor.`
            });
          }
        }
      }

      return results;
    });
  }

  /**
   * Generates the BoM components checklist/shortage report for a Manufacturing Order.
   */
  static async getMoShoppingList(moId: string): Promise<any> {
    const mo = await prisma.manufacturingOrder.findUnique({
      where: { id: moId },
      include: { product: true }
    });

    if (!mo) {
      throw new Error(`Manufacturing Order ${moId} not found`);
    }

    const bomComponents = await prisma.bomComponent.findMany({
      where: { bomId: mo.bomId },
      include: { componentProduct: true }
    });

    return bomComponents.map((comp) => {
      const requiredQty = comp.quantity * mo.quantity;
      const product = comp.componentProduct;
      const freeToUse = product.onHandQty - product.reservedQty;
      const shortageQty = Math.max(0, requiredQty - freeToUse);

      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        requiredQty,
        onHandQty: product.onHandQty,
        reservedQty: product.reservedQty,
        freeToUseQty: freeToUse,
        shortageQty,
        isShort: shortageQty > 0
      };
    });
  }

  /**
   * Computes the maximum buildable quantity for a finished good based on current free-to-use raw materials.
   */
  static async maxBuildableQuantity(productId: string): Promise<number> {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product || !product.defaultBomId) {
      return 0;
    }

    const bomComponents = await prisma.bomComponent.findMany({
      where: { bomId: product.defaultBomId },
      include: { componentProduct: true }
    });

    if (bomComponents.length === 0) {
      return 0;
    }

    let minBuildable = Infinity;

    for (const comp of bomComponents) {
      const compProduct = comp.componentProduct;
      const freeToUse = compProduct.onHandQty - compProduct.reservedQty;
      const componentQtyPerUnit = comp.quantity;

      if (componentQtyPerUnit <= 0) continue;

      const buildableForComponent = Math.floor(freeToUse / componentQtyPerUnit);
      if (buildableForComponent < minBuildable) {
        minBuildable = buildableForComponent;
      }
    }

    return minBuildable === Infinity ? 0 : minBuildable;
  }

  /**
   * Sweeps the entire inventory for raw materials below their reorder points and updates alerts.
   */
  static async runLowStockSweep(): Promise<any[]> {
    const rawMaterials = await prisma.product.findMany({
      where: { productType: 'raw_material', isActive: true }
    });

    const activeAlerts = [];

    for (const mat of rawMaterials) {
      const freeToUse = mat.onHandQty - mat.reservedQty;

      if (freeToUse < mat.reorderPoint) {
        const shortage = mat.reorderPoint - freeToUse;
        
        // Find existing alert
        const alert = await prisma.lowStockAlert.findFirst({
          where: { productId: mat.id, status: 'active' }
        });

        if (alert) {
          const updated = await prisma.lowStockAlert.update({
            where: { id: alert.id },
            data: { shortageQty: shortage }
          });
          activeAlerts.push(updated);
        } else {
          const created = await prisma.lowStockAlert.create({
            data: {
              productId: mat.id,
              shortageQty: shortage,
              status: 'active'
            }
          });
          activeAlerts.push(created);
        }
      } else {
        // Resolve any active alerts for this product
        await prisma.lowStockAlert.updateMany({
          where: { productId: mat.id, status: 'active' },
          data: { status: 'resolved' }
        });
      }
    }

    return activeAlerts;
  }
}
