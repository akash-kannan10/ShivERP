import { Router, Response } from 'express';
import { prisma } from '../config';
import { AuthenticatedRequest, authenticateToken, requirePermission } from '../middleware/authMiddleware';
import { ProcurementService } from '../services/procurementService';
import { InventoryService } from '../services/inventoryService';

const router = Router();

// GET /api/manufacturing - List MOs
router.get('/', authenticateToken, requirePermission('manufacturing', 'view'), async (req, res) => {
  try {
    const orders = await prisma.manufacturingOrder.findMany({
      include: {
        product: true,
        bom: true,
        assignee: true,
        workOrders: { include: { workCenter: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Manufacturing Orders' });
  }
});

// GET /api/manufacturing/shopping-list/:id - Get shopping list
router.get('/shopping-list/:id', authenticateToken, requirePermission('manufacturing', 'view'), async (req, res) => {
  const { id } = req.params;
  try {
    const list = await ProcurementService.getMoShoppingList(id);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate shopping list' });
  }
});

// GET /api/manufacturing/:id - Fetch single MO
router.get('/:id', authenticateToken, requirePermission('manufacturing', 'view'), async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        product: true,
        bom: {
          include: {
            components: { include: { componentProduct: true } },
            operations: { include: { workCenter: true } }
          }
        },
        assignee: true,
        workOrders: { include: { workCenter: true }, orderBy: { sequence: 'asc' } }
      }
    });
    if (!order) return res.status(404).json({ error: 'Manufacturing Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Manufacturing Order' });
  }
});

// POST /api/manufacturing - Create MO
router.post('/', authenticateToken, requirePermission('manufacturing', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  const { productId, quantity, bomId, dueDate, assigneeId, sourceSalesOrderId } = req.body;

  if (!productId || !quantity || !bomId || !dueDate) {
    return res.status(400).json({ error: 'Product ID, Quantity, BoM ID, and Due Date are required' });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const count = await tx.manufacturingOrder.count();
      const orderNumber = `MO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      // Create MO
      const mo = await tx.manufacturingOrder.create({
        data: {
          orderNumber,
          productId,
          bomId,
          quantity: Number(quantity),
          status: 'draft',
          dueDate: new Date(dueDate),
          assigneeId: assigneeId || null,
          sourceSalesOrderId: sourceSalesOrderId || null
        }
      });

      // Fetch operations from BoM to auto-create work orders
      const bomOps = await tx.bomOperation.findMany({
        where: { bomId },
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

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'create',
          entityType: 'manufacturing_order',
          entityId: mo.id,
          newValue: JSON.stringify(mo)
        }
      });

      return mo;
    });

    const completeMo = await prisma.manufacturingOrder.findUnique({
      where: { id: order.id },
      include: {
        product: true,
        bom: true,
        assignee: true,
        workOrders: { include: { workCenter: true } }
      }
    });

    res.status(201).json(completeMo);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Manufacturing Order' });
  }
});

// POST /api/manufacturing/:id/reserve - Reserve components
router.post('/:id/reserve', authenticateToken, requirePermission('manufacturing', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const mo = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: { product: true }
    });

    if (!mo) return res.status(404).json({ error: 'Manufacturing Order not found' });
    if (mo.status !== 'draft') {
      return res.status(400).json({ error: `Cannot reserve components for order in "${mo.status}" status` });
    }

    const bomComponents = await prisma.bomComponent.findMany({
      where: { bomId: mo.bomId }
    });

    await prisma.$transaction(async (tx) => {
      for (const comp of bomComponents) {
        const requiredQty = comp.quantity * mo.quantity;
        // Attempt component reservation
        await InventoryService.recordStockMovement({
          productId: comp.componentProductId,
          movementType: 'mo_reservation',
          quantityDelta: requiredQty,
          referenceType: 'manufacturing_order',
          referenceId: mo.id,
          userId: req.user!.id
        }, tx);
      }

      // Update status
      await tx.manufacturingOrder.update({
        where: { id },
        data: { status: 'components_reserved' }
      });

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'status_change',
          entityType: 'manufacturing_order',
          entityId: id,
          oldValue: 'draft',
          newValue: 'components_reserved'
        }
      });
    });

    const updated = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: { product: true, bom: true, assignee: true, workOrders: { include: { workCenter: true } } }
    });

    res.json({ message: 'Components reserved successfully', order: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Component reservation failed' });
  }
});

// POST /api/manufacturing/:id/start - Start production
router.post('/:id/start', authenticateToken, requirePermission('manufacturing', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const mo = await prisma.manufacturingOrder.findUnique({ where: { id } });
    if (!mo) return res.status(404).json({ error: 'Manufacturing Order not found' });
    if (mo.status !== 'components_reserved' && mo.status !== 'draft') {
      return res.status(400).json({ error: `Cannot start order in "${mo.status}" status` });
    }

    const updated = await prisma.manufacturingOrder.update({
      where: { id },
      data: { status: 'in_progress' },
      include: { product: true, bom: true, assignee: true, workOrders: { include: { workCenter: true } } }
    });

    // Log Audit
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'status_change',
        entityType: 'manufacturing_order',
        entityId: id,
        oldValue: mo.status,
        newValue: 'in_progress'
      }
    });

    res.json({ message: 'Production started', order: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start production' });
  }
});

// POST /api/manufacturing/:id/complete - Complete production (stock consumption + output production)
router.post('/:id/complete', authenticateToken, requirePermission('manufacturing', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const mo = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: { workOrders: true }
    });

    if (!mo) return res.status(404).json({ error: 'Manufacturing order not found' });
    if (mo.status !== 'in_progress' && mo.status !== 'components_reserved') {
      return res.status(400).json({ error: `Only orders in "in_progress" or "components_reserved" status can be completed` });
    }

    const bomComponents = await prisma.bomComponent.findMany({
      where: { bomId: mo.bomId }
    });

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Consume component stock
      for (const comp of bomComponents) {
        const requiredQty = comp.quantity * mo.quantity;
        // Consumption stock movement (decreases physical stock and releases reservation)
        await InventoryService.recordStockMovement({
          productId: comp.componentProductId,
          movementType: 'mo_consumption',
          quantityDelta: -requiredQty,
          referenceType: 'manufacturing_order',
          referenceId: mo.id,
          userId: req.user!.id
        }, tx);
      }

      // 2. Produce finished goods stock
      await InventoryService.recordStockMovement({
        productId: mo.productId,
        movementType: 'mo_production',
        quantityDelta: mo.quantity,
        referenceType: 'manufacturing_order',
        referenceId: mo.id,
        userId: req.user!.id
      }, tx);

      // 3. Mark all incomplete work orders as completed
      await tx.workOrder.updateMany({
        where: { manufacturingOrderId: id, status: { not: 'completed' } },
        data: { status: 'completed', completedAt: new Date() }
      });

      // 4. Update MO status to completed
      const finalMo = await tx.manufacturingOrder.update({
        where: { id },
        data: { status: 'completed' },
        include: { product: true, bom: true, assignee: true, workOrders: { include: { workCenter: true } } }
      });

      // 5. Track employee activity
      await tx.employeeActivity.create({
        data: {
          userId: req.user!.id,
          activityType: 'mo_completed',
          referenceId: finalMo.orderNumber
        }
      });

      // 6. Log Audit
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'status_change',
          entityType: 'manufacturing_order',
          entityId: id,
          oldValue: mo.status,
          newValue: 'completed'
        }
      });

      return finalMo;
    });

    res.json({ message: 'Production completed. Stock updated successfully.', order: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to complete production' });
  }
});

// POST /api/manufacturing/work-orders/:woId/complete - Complete single Work Order
router.post('/work-orders/:woId/complete', authenticateToken, requirePermission('manufacturing', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { woId } = req.params;

  try {
    const wo = await prisma.workOrder.findUnique({ where: { id: woId } });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    if (wo.status === 'completed') {
      return res.status(400).json({ error: 'Work order is already completed' });
    }

    const updatedWo = await prisma.workOrder.update({
      where: { id: woId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        assignedToId: req.user!.id
      },
      include: { workCenter: true }
    });

    res.json({ message: `Work order "${wo.operationName}" completed`, workOrder: updatedWo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete work order' });
  }
});

// POST /api/manufacturing/work-orders/:woId/start - Start single Work Order
router.post('/work-orders/:woId/start', authenticateToken, requirePermission('manufacturing', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { woId } = req.params;

  try {
    const wo = await prisma.workOrder.findUnique({ where: { id: woId } });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const updatedWo = await prisma.workOrder.update({
      where: { id: woId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
        assignedToId: req.user!.id
      },
      include: { workCenter: true }
    });

    res.json({ message: `Work order "${wo.operationName}" started`, workOrder: updatedWo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start work order' });
  }
});

export default router;
