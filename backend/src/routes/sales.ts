import { Router, Response } from 'express';
import { prisma } from '../config';
import { AuthenticatedRequest, authenticateToken, requirePermission } from '../middleware/authMiddleware';
import { ProcurementService } from '../services/procurementService';
import { InventoryService } from '../services/inventoryService';

const router = Router();

// GET /api/sales - List sales orders
router.get('/', authenticateToken, requirePermission('sales', 'view'), async (req, res) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        lines: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

// GET /api/sales/:id - Fetch single sales order
router.get('/:id', authenticateToken, requirePermission('sales', 'view'), async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { include: { product: true } }
      }
    });
    if (!order) return res.status(404).json({ error: 'Sales order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales order' });
  }
});

// POST /api/sales - Create draft Sales Order
router.post('/', authenticateToken, requirePermission('sales', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  const { customerId, expectedDeliveryDate, lines } = req.body;

  if (!customerId || !expectedDeliveryDate || !lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Customer ID, expected delivery date, and order lines are required' });
  }

  // Check for duplicate product IDs
  const productIds = lines.map(l => l.productId);
  const uniqueProductIds = new Set(productIds);
  if (productIds.length !== uniqueProductIds.size) {
    return res.status(400).json({ error: 'Duplicate products selected. Please increase the quantity of the existing line instead.' });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Generate SO number
      const count = await tx.salesOrder.count();
      const orderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      let totalAmount = 0;
      const orderLinesData = [];

      for (const line of lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) throw new Error(`Product with ID ${line.productId} not found`);

        const lineTotal = product.salesPrice * Number(line.quantity);
        totalAmount += lineTotal;

        orderLinesData.push({
          productId: line.productId,
          quantity: Number(line.quantity),
          unitPrice: product.salesPrice,
          deliveredQuantity: 0
        });
      }

      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId,
          status: 'draft',
          expectedDeliveryDate: new Date(expectedDeliveryDate),
          createdById: req.user!.id,
          totalAmount,
          lines: {
            create: orderLinesData
          }
        },
        include: {
          customer: true,
          lines: { include: { product: true } }
        }
      });

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'create',
          entityType: 'sales_order',
          entityId: salesOrder.id,
          newValue: JSON.stringify(salesOrder)
        }
      });

      return salesOrder;
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create sales order' });
  }
});

// POST /api/sales/:id/confirm - Confirm sales order and check procurement (MTO/MTS)
router.post('/:id/confirm', authenticateToken, requirePermission('sales', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id }
    });

    if (!order) return res.status(404).json({ error: 'Sales order not found' });
    if (order.status !== 'draft') {
      return res.status(400).json({ error: `Cannot confirm sales order in "${order.status}" status` });
    }

    // Set order status to confirmed
    const confirmedOrder = await prisma.salesOrder.update({
      where: { id },
      data: { status: 'confirmed' }
    });

    // Run procurement checks (MTO trigger / MTS reservation)
    const procurementResults = await ProcurementService.checkAndTriggerProcurement(id, req.user!.id);

    // Track employee activity
    await prisma.employeeActivity.create({
      data: {
        userId: req.user!.id,
        activityType: 'so_created',
        referenceId: confirmedOrder.orderNumber
      }
    });

    // Audit Log status change
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'status_change',
        entityType: 'sales_order',
        entityId: id,
        oldValue: 'draft',
        newValue: 'confirmed'
      }
    });

    res.json({
      message: 'Sales Order confirmed successfully',
      order: confirmedOrder,
      procurement: procurementResults
    });

  } catch (error: any) {
    // If confirmation fails, rollback order status to draft
    await prisma.salesOrder.update({
      where: { id },
      data: { status: 'draft' }
    }).catch(() => {});

    res.status(500).json({ error: error.message || 'Failed to confirm sales order' });
  }
});

// POST /api/sales/:id/deliver - Deliver finished products (stock reduction)
router.post('/:id/deliver', authenticateToken, requirePermission('sales', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: { include: { product: true } } }
    });

    if (!order) return res.status(404).json({ error: 'Sales order not found' });
    if (order.status !== 'confirmed' && order.status !== 'partially_delivered') {
      return res.status(400).json({ error: `Only orders in "confirmed" or "partially_delivered" status can be delivered` });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      let allLinesDelivered = true;

      for (const line of order.lines) {
        const remainingQty = line.quantity - line.deliveredQuantity;
        if (remainingQty <= 0) continue;

        // Perform stock movement sales_delivery (reduces onHandQty and releases reservation)
        await InventoryService.recordStockMovement({
          productId: line.productId,
          movementType: 'sales_delivery',
          quantityDelta: -remainingQty,
          referenceType: 'sales_order',
          referenceId: order.id,
          userId: req.user!.id
        }, tx);

        // Update line delivered quantity
        await tx.salesOrderLine.update({
          where: { id: line.id },
          data: { deliveredQuantity: line.quantity }
        });
      }

      // Mark order status
      const nextStatus = 'fully_delivered';

      const finalOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: nextStatus },
        include: { customer: true, lines: { include: { product: true } } }
      });

      // Track activity
      await tx.employeeActivity.create({
        data: {
          userId: req.user!.id,
          activityType: 'delivery_completed',
          referenceId: finalOrder.orderNumber
        }
      });

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'status_change',
          entityType: 'sales_order',
          entityId: id,
          oldValue: order.status,
          newValue: nextStatus
        }
      });

      return finalOrder;
    });

    res.json({ message: 'Products delivered successfully', order: updatedOrder });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Delivery transaction failed' });
  }
});

// POST /api/sales/:id/cancel - Cancel Sales Order (Releases reservations)
router.post('/:id/cancel', authenticateToken, requirePermission('sales', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!order) return res.status(404).json({ error: 'Sales order not found' });
    if (order.status === 'fully_delivered' || order.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot cancel a ${order.status} sales order` });
    }

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // If it was confirmed, release any reservations
      if (order.status === 'confirmed' || order.status === 'partially_delivered') {
        for (const line of order.lines) {
          const reservedToRelease = line.quantity; // release entire reservation
          if (reservedToRelease > 0) {
            await InventoryService.recordStockMovement({
              productId: line.productId,
              movementType: 'cancel_sales_reservation',
              quantityDelta: reservedToRelease,
              referenceType: 'sales_order',
              referenceId: order.id,
              userId: req.user!.id
            }, tx);
          }
        }
      }

      const finalOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: 'cancelled' }
      });

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'status_change',
          entityType: 'sales_order',
          entityId: id,
          oldValue: order.status,
          newValue: 'cancelled'
        }
      });

      return finalOrder;
    });

    res.json({ message: 'Sales Order cancelled and stock reservations released', order: cancelledOrder });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel sales order' });
  }
});

export default router;
