import { Router } from 'express';
import { prisma } from '../config';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

// GET /api/boms - Fetch all BoMs
router.get('/', authenticateToken, requirePermission('boms', 'view'), async (req, res) => {
  try {
    const boms = await prisma.bom.findMany({
      include: {
        product: true,
        components: { include: { componentProduct: true } },
        operations: { include: { workCenter: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(boms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Bills of Materials' });
  }
});

// GET /api/boms/workcenters - Helper to fetch all workcenters
router.get('/workcenters', authenticateToken, async (req, res) => {
  try {
    const wcs = await prisma.workCenter.findMany();
    res.json(wcs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work centers' });
  }
});

// GET /api/boms/:id - Fetch single BoM
router.get('/:id', authenticateToken, requirePermission('boms', 'view'), async (req, res) => {
  const { id } = req.params;
  try {
    const bom = await prisma.bom.findUnique({
      where: { id },
      include: {
        product: true,
        components: { include: { componentProduct: true } },
        operations: { include: { workCenter: true } }
      }
    });

    if (!bom) return res.status(404).json({ error: 'BoM not found' });
    res.json(bom);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch BoM' });
  }
});

// POST /api/boms - Create BoM
router.post('/', authenticateToken, requirePermission('boms', 'create'), async (req, res) => {
  const { productId, version, components, operations } = req.body;

  if (!productId || !components || !Array.isArray(components)) {
    return res.status(400).json({ error: 'Product ID and Components array are required' });
  }

  try {
    const bom = await prisma.$transaction(async (tx) => {
      // Create BoM
      const newBom = await tx.bom.create({
        data: {
          productId,
          version: version || '1.0',
          isActive: true
        }
      });

      // Create components
      for (const comp of components) {
        await tx.bomComponent.create({
          data: {
            bomId: newBom.id,
            componentProductId: comp.componentProductId,
            quantity: Number(comp.quantity),
            unit: comp.unit || 'pcs'
          }
        });
      }

      // Create operations
      if (operations && Array.isArray(operations)) {
        for (const op of operations) {
          await tx.bomOperation.create({
            data: {
              bomId: newBom.id,
              operationName: op.operationName,
              sequence: Number(op.sequence),
              durationMinutes: Number(op.durationMinutes),
              workCenterId: op.workCenterId
            }
          });
        }
      }

      // Automatically link this new BoM to the product as default if none exists
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (product && !product.defaultBomId) {
        await tx.product.update({
          where: { id: productId },
          data: { defaultBomId: newBom.id }
        });
      }

      return newBom;
    });

    // Fetch complete BoM to return
    const completeBom = await prisma.bom.findUnique({
      where: { id: bom.id },
      include: {
        product: true,
        components: { include: { componentProduct: true } },
        operations: { include: { workCenter: true } }
      }
    });

    res.status(201).json(completeBom);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create BoM' });
  }
});

// PUT /api/boms/:id - Update BoM
router.put('/:id', authenticateToken, requirePermission('boms', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { version, isActive, components, operations } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      // Update basic fields
      await tx.bom.update({
        where: { id },
        data: {
          version,
          isActive: isActive !== undefined ? isActive : undefined
        }
      });

      // If components provided, delete existing and recreate
      if (components && Array.isArray(components)) {
        await tx.bomComponent.deleteMany({ where: { bomId: id } });
        for (const comp of components) {
          await tx.bomComponent.create({
            data: {
              bomId: id,
              componentProductId: comp.componentProductId,
              quantity: Number(comp.quantity),
              unit: comp.unit
            }
          });
        }
      }

      // If operations provided, delete existing and recreate
      if (operations && Array.isArray(operations)) {
        await tx.bomOperation.deleteMany({ where: { bomId: id } });
        for (const op of operations) {
          await tx.bomOperation.create({
            data: {
              bomId: id,
              operationName: op.operationName,
              sequence: Number(op.sequence),
              durationMinutes: Number(op.durationMinutes),
              workCenterId: op.workCenterId
            }
          });
        }
      }
    });

    const completeBom = await prisma.bom.findUnique({
      where: { id },
      include: {
        product: true,
        components: { include: { componentProduct: true } },
        operations: { include: { workCenter: true } }
      }
    });

    res.json(completeBom);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update BoM' });
  }
});

// DELETE /api/boms/:id - Delete BoM
router.delete('/:id', authenticateToken, requirePermission('boms', 'delete'), async (req, res) => {
  const { id } = req.params;
  try {
    const bom = await prisma.bom.findUnique({ where: { id } });
    if (!bom) return res.status(404).json({ error: 'BoM not found' });

    // Check if used in manufacturing
    const inUse = await prisma.manufacturingOrder.findFirst({ where: { bomId: id } });
    if (inUse) {
      return res.status(400).json({ error: 'Cannot delete BoM: it is referenced in one or more Manufacturing Orders.' });
    }

    await prisma.bom.delete({ where: { id } });
    res.json({ message: 'BoM deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete BoM' });
  }
});

export default router;
