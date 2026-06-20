import { Router, Response } from 'express';
import { prisma } from '../config';
import { AuthenticatedRequest, authenticateToken, requirePermission } from '../middleware/authMiddleware';
import { InventoryService } from '../services/inventoryService';
import { ProcurementService } from '../services/procurementService';

const router = Router();

// GET /api/inventory/dashboard - Get stock summary for all active products
router.get('/dashboard', authenticateToken, requirePermission('inventory', 'view'), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { defaultVendor: true },
      orderBy: { name: 'asc' }
    });

    const stockSummary = products.map(p => {
      const freeToUse = p.onHandQty - p.reservedQty;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        productType: p.productType,
        onHandQty: p.onHandQty,
        reservedQty: p.reservedQty,
        freeToUseQty: freeToUse,
        unit: p.unit,
        costPrice: p.costPrice,
        salesPrice: p.salesPrice,
        defaultVendor: p.defaultVendor?.name || 'N/A',
        isLowStock: freeToUse < p.reorderPoint
      };
    });

    res.json(stockSummary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory dashboard statistics' });
  }
});

// GET /api/inventory/ledger - Get immutable stock ledger
router.get('/ledger', authenticateToken, requirePermission('inventory', 'view'), async (req, res) => {
  const { productId, movementType } = req.query;
  try {
    const ledger = await prisma.stockLedger.findMany({
      where: {
        productId: productId ? String(productId) : undefined,
        movementType: movementType ? String(movementType) : undefined
      },
      include: {
        product: true,
        createdBy: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock ledger' });
  }
});

// POST /api/inventory/adjust - Perform manual adjustment
router.post('/adjust', authenticateToken, requirePermission('inventory', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { productId, quantityDelta, reason } = req.body;

  if (!productId || quantityDelta === undefined || !reason) {
    return res.status(400).json({ error: 'Product ID, Quantity Delta, and Reason are required' });
  }

  try {
    const result = await InventoryService.adjustStock(
      productId,
      Number(quantityDelta),
      reason,
      req.user!.id
    );

    res.json({
      message: 'Stock adjusted successfully',
      product: result.product,
      ledgerEntry: result.ledgerEntry
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Stock adjustment failed' });
  }
});

// GET /api/inventory/alerts - Get low stock alerts (triggers fresh sweep)
router.get('/alerts', authenticateToken, requirePermission('inventory', 'view'), async (req, res) => {
  try {
    // Run sweep to update alerts state
    await ProcurementService.runLowStockSweep();

    // Fetch active alerts
    const alerts = await prisma.lowStockAlert.findMany({
      where: { status: 'active' },
      include: {
        product: {
          include: {
            defaultVendor: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch low stock alerts' });
  }
});

export default router;
