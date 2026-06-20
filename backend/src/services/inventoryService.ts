import { prisma } from '../config';

export interface StockMovementParams {
  productId: string;
  movementType: 
    | 'purchase_receipt' 
    | 'sales_delivery' 
    | 'mo_consumption' 
    | 'mo_production' 
    | 'stock_adjustment'
    | 'sales_reservation'
    | 'mo_reservation'
    | 'cancel_sales_reservation'
    | 'cancel_mo_reservation';
  quantityDelta: number; // Positive for additions, negative for reductions
  referenceType?: 'sales_order' | 'purchase_order' | 'manufacturing_order' | 'adjustment' | null;
  referenceId?: string | null;
  userId?: string | null;
}

export class InventoryService {
  /**
   * Records a stock movement, updates physical and reserved counts, and logs to the immutable StockLedger.
   * Can be executed inside an existing Prisma transaction.
   */
  static async recordStockMovement(
    params: StockMovementParams,
    txClient?: any
  ): Promise<any> {
    const { productId, movementType, quantityDelta, referenceType, referenceId, userId } = params;

    const executeMovement = async (tx: any) => {
      // 1. Fetch current product stock details
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      let newOnHand = product.onHandQty;
      let newReserved = product.reservedQty;

      // 2. Determine impact based on movement type
      switch (movementType) {
        case 'sales_reservation':
        case 'mo_reservation':
          // Reservation increases reserved quantity, on-hand is unchanged
          newReserved += quantityDelta; // quantityDelta should be positive here
          break;

        case 'cancel_sales_reservation':
        case 'cancel_mo_reservation':
          // Cancelling reservation decreases reserved quantity
          newReserved -= quantityDelta; // quantityDelta should be positive here
          break;

        case 'purchase_receipt':
        case 'mo_production':
          // Production/Receipt increases on-hand stock
          newOnHand += quantityDelta; // quantityDelta should be positive
          break;

        case 'sales_delivery':
        case 'mo_consumption':
          // Delivery/Consumption decreases on-hand AND releases the reservation
          // quantityDelta is negative (e.g. -5), so we add it to onHand, and subtract its absolute value from reserved
          newOnHand += quantityDelta; // e.g. 10 + (-5) = 5
          newReserved += quantityDelta; // e.g. 10 + (-5) = 5 (releasing reservation)
          break;

        case 'stock_adjustment':
          // Adjust on-hand quantity, reserved quantity remains unchanged
          newOnHand += quantityDelta;
          break;

        default:
          throw new Error(`Unknown stock movement type: ${movementType}`);
      }

      // 3. Prevent physical stock from going negative (unless it's a custom case, but in ERP physical stock cannot be negative)
      if (newOnHand < 0) {
        throw new Error(
          `Transaction aborted: Physical stock for ${product.name} (SKU: ${product.sku}) cannot fall below zero. Current: ${product.onHandQty}, Attempted change: ${quantityDelta}`
        );
      }

      // 4. Calculate Free to Use quantity
      const newFreeToUse = newOnHand - newReserved;

      // 5. Enforce free-to-use constraint: cannot go negative
      if (newFreeToUse < 0) {
        throw new Error(
          `Transaction aborted: Insufficient available stock for ${product.name} (SKU: ${product.sku}). Free-to-use quantity would go negative. (On Hand: ${newOnHand}, Reserved: ${newReserved}, Free to Use: ${newFreeToUse})`
        );
      }

      // 6. Update Product stock totals
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          onHandQty: newOnHand,
          reservedQty: newReserved
        }
      });

      // 7. Insert entry into Stock Ledger
      const ledgerEntry = await tx.stockLedger.create({
        data: {
          productId,
          movementType,
          quantityDelta,
          referenceType,
          referenceId,
          balanceAfter: newOnHand,
          createdById: userId
        }
      });

      // 8. If raw material is below reorder point/safe stock level, record/check alerts
      if (updatedProduct.productType === 'raw_material') {
        const freeToUse = updatedProduct.onHandQty - updatedProduct.reservedQty;
        if (freeToUse < updatedProduct.reorderPoint) {
          const shortage = updatedProduct.reorderPoint - freeToUse;
          // Check if an active alert already exists
          const existingAlert = await tx.lowStockAlert.findFirst({
            where: { productId, status: 'active' }
          });

          if (existingAlert) {
            await tx.lowStockAlert.update({
              where: { id: existingAlert.id },
              data: { shortageQty: shortage }
            });
          } else {
            await tx.lowStockAlert.create({
              data: {
                productId,
                shortageQty: shortage,
                status: 'active'
              }
            });
          }
        } else {
          // Resolve alert if stock replenished above reorder point
          await tx.lowStockAlert.updateMany({
            where: { productId, status: 'active' },
            data: { status: 'resolved' }
          });
        }
      }

      return { product: updatedProduct, ledgerEntry };
    };

    if (txClient) {
      return await executeMovement(txClient);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await executeMovement(tx);
      });
    }
  }

  /**
   * Helper to perform a manual stock adjustment
   */
  static async adjustStock(
    productId: string,
    quantityDelta: number,
    reason: string,
    userId: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // 1. Create StockAdjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          productId,
          quantityDelta,
          reason,
          createdById: userId
        }
      });

      // 2. Process via general ledger movement
      const result = await this.recordStockMovement({
        productId,
        movementType: 'stock_adjustment',
        quantityDelta,
        referenceType: 'adjustment',
        referenceId: adjustment.id,
        userId
      }, tx);

      // 3. Write Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'update',
          entityType: 'product',
          entityId: productId,
          newValue: JSON.stringify({ quantityDelta, reason, newOnHand: result.product.onHandQty })
        }
      });

      return { adjustment, ...result };
    });
  }
}
