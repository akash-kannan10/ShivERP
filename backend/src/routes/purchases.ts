import { Router, Response } from 'express';
import { prisma } from '../config';
import { AuthenticatedRequest, authenticateToken, requirePermission } from '../middleware/authMiddleware';
import { InventoryService } from '../services/inventoryService';

const router = Router();

// GET /api/purchases - List purchase orders
router.get('/', authenticateToken, requirePermission('purchases', 'view'), async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        vendor: true,
        lines: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// GET /api/purchases/:id - Fetch single purchase order
router.get('/:id', authenticateToken, requirePermission('purchases', 'view'), async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        lines: { include: { product: true } }
      }
    });
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// POST /api/purchases - Create draft purchase order
router.post('/', authenticateToken, requirePermission('purchases', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  const { vendorId, expectedDate, lines } = req.body;

  if (!vendorId || !expectedDate || !lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Vendor ID, expected date, and order lines are required' });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      let count = await tx.purchaseOrder.count();
      let orderNumber = '';
      let isUnique = false;
      while (!isUnique) {
        orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
        const existing = await tx.purchaseOrder.findUnique({ where: { orderNumber } });
        if (!existing) {
          isUnique = true;
        } else {
          count++;
        }
      }

      let totalAmount = 0;
      const orderLinesData = [];

      for (const line of lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) throw new Error(`Product with ID ${line.productId} not found`);

        // Use supplied costPrice or product default costPrice
        const unitCost = Number(line.unitCost) || product.costPrice;
        const lineTotal = unitCost * Number(line.quantity);
        totalAmount += lineTotal;

        orderLinesData.push({
          productId: line.productId,
          quantity: Number(line.quantity),
          unitCost,
          receivedQuantity: 0
        });
      }

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          vendorId,
          status: 'draft',
          expectedDate: new Date(expectedDate),
          createdById: req.user!.id,
          totalAmount,
          lines: {
            create: orderLinesData
          }
        },
        include: {
          vendor: true,
          lines: { include: { product: true } }
        }
      });

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'create',
          entityType: 'purchase_order',
          entityId: purchaseOrder.id,
          newValue: JSON.stringify(purchaseOrder)
        }
      });

      return purchaseOrder;
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create purchase order' });
  }
});

// POST /api/purchases/:id/confirm - Confirm purchase order
router.post('/:id/confirm', authenticateToken, requirePermission('purchases', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    if (order.status !== 'draft') {
      return res.status(400).json({ error: `Cannot confirm purchase order in "${order.status}" status` });
    }

    const confirmedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'confirmed' },
      include: { vendor: true, lines: { include: { product: true } } }
    });

    // Track activity
    await prisma.employeeActivity.create({
      data: {
        userId: req.user!.id,
        activityType: 'po_created',
        referenceId: confirmedOrder.orderNumber
      }
    });

    // Log Audit
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'status_change',
        entityType: 'purchase_order',
        entityId: id,
        oldValue: 'draft',
        newValue: 'confirmed'
      }
    });

    res.json({ message: 'Purchase Order confirmed', order: confirmedOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm purchase order' });
  }
});

// POST /api/purchases/:id/receive - Receive products (stock increase)
router.post('/:id/receive', authenticateToken, requirePermission('purchases', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { receipts } = req.body; // Array of { productId, quantityToReceive }

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    if (order.status !== 'confirmed' && order.status !== 'partially_received') {
      return res.status(400).json({ error: `Only orders in "confirmed" or "partially_received" status can receive goods` });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      let allLinesReceived = true;

      for (const line of order.lines) {
        // Find if custom quantity to receive is sent, otherwise receive remaining
        let qtyToReceive = line.quantity - line.receivedQuantity;
        if (receipts && Array.isArray(receipts)) {
          const customReceipt = receipts.find((r: any) => r.productId === line.productId);
          if (customReceipt) {
            qtyToReceive = Math.min(qtyToReceive, Number(customReceipt.quantityToReceive));
          }
        }

        if (qtyToReceive <= 0) continue;

        // Perform stock movement purchase_receipt (increases physical inventory)
        await InventoryService.recordStockMovement({
          productId: line.productId,
          movementType: 'purchase_receipt',
          quantityDelta: qtyToReceive,
          referenceType: 'purchase_order',
          referenceId: order.id,
          userId: req.user!.id
        }, tx);

        // Update line item
        const newReceivedQty = line.receivedQuantity + qtyToReceive;
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { receivedQuantity: newReceivedQty }
        });

        if (newReceivedQty < line.quantity) {
          allLinesReceived = false;
        }
      }

      // Check if all lines are fully received
      const reFetchedLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: id }
      });
      const fullyReceived = reFetchedLines.every(l => l.receivedQuantity >= l.quantity);

      const nextStatus = fullyReceived ? 'fully_received' : 'partially_received';

      const finalOrder = await tx.purchaseOrder.update({
        where: { id },
        data: { status: nextStatus },
        include: { vendor: true, lines: { include: { product: true } } }
      });

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'status_change',
          entityType: 'purchase_order',
          entityId: id,
          oldValue: order.status,
          newValue: nextStatus
        }
      });

      return finalOrder;
    });

    res.json({ message: 'Purchase products received successfully', order: updatedOrder });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Receive transaction failed' });
  }
});

// POST /api/purchases/:id/cancel - Cancel Purchase Order
router.post('/:id/cancel', authenticateToken, requirePermission('purchases', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    if (order.status === 'fully_received' || order.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot cancel a ${order.status} purchase order` });
    }

    const cancelledOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    // Log Audit
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'status_change',
        entityType: 'purchase_order',
        entityId: id,
        oldValue: order.status,
        newValue: 'cancelled'
      }
    });

    res.json({ message: 'Purchase Order cancelled successfully', order: cancelledOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel purchase order' });
  }
});

export default router;
