import { Router, Response } from 'express';
import { prisma } from '../config';
import { AuthenticatedRequest, authenticateToken, requirePermission } from '../middleware/authMiddleware';
import { ProcurementService } from '../services/procurementService';

const router = Router();

// GET /api/products - Get all products (can filter by type)
router.get('/', authenticateToken, requirePermission('products', 'view'), async (req, res) => {
  const { type } = req.query;
  try {
    const products = await prisma.product.findMany({
      where: type ? { productType: type as string } : undefined,
      include: { defaultVendor: true },
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/max-buildable/:id
router.get('/max-buildable/:id', authenticateToken, requirePermission('products', 'view'), async (req, res) => {
  const { id } = req.params;
  try {
    const qty = await ProcurementService.maxBuildableQuantity(id);
    res.json({ maxBuildable: qty });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to calculate max buildable' });
  }
});

// GET /api/products/:id
router.get('/:id', authenticateToken, requirePermission('products', 'view'), async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { defaultVendor: true }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/', authenticateToken, requirePermission('products', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, sku, productType, salesPrice, costPrice, procurementStrategy, procurementType, defaultVendorId, reorderPoint, safeStockLevel, unit } = req.body;

  if (!name || !sku || !productType) {
    return res.status(400).json({ error: 'Name, SKU, and Product Type are required' });
  }

  try {
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return res.status(400).json({ error: `SKU ${sku} is already in use` });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        productType,
        salesPrice: Number(salesPrice) || 0.0,
        costPrice: Number(costPrice) || 0.0,
        procurementStrategy: procurementStrategy || 'MTS',
        procurementType: procurementType || 'purchase',
        defaultVendorId: defaultVendorId || null,
        reorderPoint: Number(reorderPoint) || 0.0,
        safeStockLevel: Number(safeStockLevel) || 0.0,
        unit: unit || 'pcs',
        onHandQty: 0,
        reservedQty: 0
      }
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'create',
        entityType: 'product',
        entityId: product.id,
        newValue: JSON.stringify(product)
      }
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticateToken, requirePermission('products', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, sku, salesPrice, costPrice, procurementStrategy, procurementType, defaultVendorId, reorderPoint, safeStockLevel, unit, defaultBomId, isActive } = req.body;

  try {
    const oldProduct = await prisma.product.findUnique({ where: { id } });
    if (!oldProduct) return res.status(404).json({ error: 'Product not found' });

    // SKU check
    if (sku && sku !== oldProduct.sku) {
      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) {
        return res.status(400).json({ error: `SKU ${sku} is already in use` });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name : oldProduct.name,
        sku: sku !== undefined ? sku : oldProduct.sku,
        salesPrice: salesPrice !== undefined ? Number(salesPrice) : oldProduct.salesPrice,
        costPrice: costPrice !== undefined ? Number(costPrice) : oldProduct.costPrice,
        procurementStrategy: procurementStrategy !== undefined ? procurementStrategy : oldProduct.procurementStrategy,
        procurementType: procurementType !== undefined ? procurementType : oldProduct.procurementType,
        defaultVendorId: defaultVendorId !== undefined ? (defaultVendorId || null) : oldProduct.defaultVendorId,
        defaultBomId: defaultBomId !== undefined ? (defaultBomId || null) : oldProduct.defaultBomId,
        reorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : oldProduct.reorderPoint,
        safeStockLevel: safeStockLevel !== undefined ? Number(safeStockLevel) : oldProduct.safeStockLevel,
        unit: unit !== undefined ? unit : oldProduct.unit,
        isActive: isActive !== undefined ? isActive : oldProduct.isActive
      }
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'update',
        entityType: 'product',
        entityId: product.id,
        oldValue: JSON.stringify(oldProduct),
        newValue: JSON.stringify(product)
      }
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticateToken, requirePermission('products', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Check if stock is 0
    if (product.onHandQty > 0 || product.reservedQty > 0) {
      return res.status(400).json({ error: 'Cannot delete product with remaining inventory or reserved items. Adjust stock to 0 first.' });
    }

    await prisma.product.delete({ where: { id } });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'delete',
        entityType: 'product',
        entityId: id,
        oldValue: JSON.stringify(product)
      }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product. Ensure it is not referenced in Sales, Purchases, or BoMs.' });
  }
});

export default router;
