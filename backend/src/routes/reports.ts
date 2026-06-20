import { Router, Response } from 'express';
import { prisma } from '../config';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

// GET /api/reports/dashboard/metrics - Fetch executive dashboard KPI metrics
router.get('/dashboard/metrics', authenticateToken, async (req, res) => {
  try {
    const totalSOs = await prisma.salesOrder.count();
    const pendingDeliveries = await prisma.salesOrder.count({
      where: { status: { in: ['confirmed', 'partially_delivered'] } }
    });
    
    const totalPOs = await prisma.purchaseOrder.count();
    const partialReceipts = await prisma.purchaseOrder.count({
      where: { status: 'partially_received' }
    });

    const activeMOs = await prisma.manufacturingOrder.count({
      where: { status: { in: ['draft', 'components_reserved', 'in_progress'] } }
    });

    const lowStockAlerts = await prisma.lowStockAlert.count({
      where: { status: 'active' }
    });

    // Delayed Orders (Expected date passed but order is not complete/cancelled)
    const now = new Date();
    const delayedSOs = await prisma.salesOrder.count({
      where: {
        status: { notIn: ['fully_delivered', 'cancelled'] },
        expectedDeliveryDate: { lt: now }
      }
    });

    const delayedMOs = await prisma.manufacturingOrder.count({
      where: {
        status: { notIn: ['completed', 'cancelled'] },
        dueDate: { lt: now }
      }
    });

    const products = await prisma.product.findMany();
    const inventoryValue = products.reduce((sum, p) => sum + (p.onHandQty * p.costPrice), 0);

    res.json({
      totalSalesOrders: totalSOs,
      pendingDeliveries,
      totalPurchaseOrders: totalPOs,
      partialReceipts,
      manufacturingOrders: activeMOs,
      lowStockAlerts,
      delayedOrders: delayedSOs + delayedMOs,
      inventoryValue
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate dashboard KPIs' });
  }
});

// GET /api/reports/dashboard/charts - Charts datasets
router.get('/dashboard/charts', authenticateToken, async (req, res) => {
  try {
    // 1. Sales Trend (Last 6 months or 7 days)
    const salesOrders = await prisma.salesOrder.findMany({
      where: { status: { not: 'cancelled' } },
      select: { createdAt: true, totalAmount: true }
    });

    // Group sales by day or month (for local database we will group by day/date for mock simplicity)
    const salesByDay: Record<string, number> = {};
    salesOrders.forEach(so => {
      const dateStr = so.createdAt.toISOString().split('T')[0];
      salesByDay[dateStr] = (salesByDay[dateStr] || 0) + so.totalAmount;
    });

    const salesTrend = Object.keys(salesByDay).map(date => ({
      date,
      amount: salesByDay[date]
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(-10); // last 10 days of sales

    // 2. Top Products by sales volume
    const orderLines = await prisma.salesOrderLine.findMany({
      include: { product: true }
    });

    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
    orderLines.forEach(line => {
      const p = line.product;
      if (!productSales[p.id]) {
        productSales[p.id] = { name: p.name, quantity: 0, revenue: 0 };
      }
      productSales[p.id].quantity += line.quantity;
      productSales[p.id].revenue += line.quantity * line.unitPrice;
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 3. Manufacturing Progress (MO counts by status)
    const draftMo = await prisma.manufacturingOrder.count({ where: { status: 'draft' } });
    const reservedMo = await prisma.manufacturingOrder.count({ where: { status: 'components_reserved' } });
    const progressMo = await prisma.manufacturingOrder.count({ where: { status: 'in_progress' } });
    const completedMo = await prisma.manufacturingOrder.count({ where: { status: 'completed' } });

    const mfgProgress = [
      { name: 'Draft', count: draftMo },
      { name: 'Reserved', count: reservedMo },
      { name: 'In Progress', count: progressMo },
      { name: 'Completed', count: completedMo }
    ];

    res.json({
      salesTrend,
      topProducts,
      mfgProgress
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch charts datasets' });
  }
});

// GET /api/reports/export - Get raw export tabular data
router.get('/export', authenticateToken, requirePermission('reports', 'view'), async (req, res) => {
  const { type } = req.query; // sales, inventory, purchase, manufacturing

  try {
    let data: any[] = [];

    if (type === 'sales') {
      const sos = await prisma.salesOrder.findMany({
        include: { customer: true, lines: { include: { product: true } } }
      });
      data = sos.map(s => ({
        'Order Number': s.orderNumber,
        'Customer': s.customer.name,
        'Order Date': s.orderDate.toISOString().split('T')[0],
        'Expected Delivery': s.expectedDeliveryDate.toISOString().split('T')[0],
        'Status': s.status,
        'Total Amount (Rs.)': s.totalAmount
      }));

    } else if (type === 'inventory') {
      const products = await prisma.product.findMany();
      data = products.map(p => ({
        'SKU': p.sku,
        'Product Name': p.name,
        'Type': p.productType,
        'On Hand Qty': p.onHandQty,
        'Reserved Qty': p.reservedQty,
        'Free to Use Qty': p.onHandQty - p.reservedQty,
        'Unit': p.unit,
        'Cost Price (Rs.)': p.costPrice,
        'Sales Price (Rs.)': p.salesPrice,
        'Strategy': p.procurementStrategy
      }));

    } else if (type === 'purchase') {
      const pos = await prisma.purchaseOrder.findMany({
        include: { vendor: true }
      });
      data = pos.map(p => ({
        'Order Number': p.orderNumber,
        'Vendor': p.vendor.name,
        'Order Date': p.orderDate.toISOString().split('T')[0],
        'Expected Date': p.expectedDate.toISOString().split('T')[0],
        'Status': p.status,
        'Total Cost (Rs.)': p.totalAmount
      }));

    } else if (type === 'manufacturing') {
      const mos = await prisma.manufacturingOrder.findMany({
        include: { product: true }
      });
      data = mos.map(m => ({
        'Order Number': m.orderNumber,
        'Product': m.product.name,
        'Quantity': m.quantity,
        'Status': m.status,
        'Due Date': m.dueDate.toISOString().split('T')[0]
      }));
    } else {
      return res.status(400).json({ error: 'Invalid report type specified' });
    }

    res.json({ reportType: type, generatedAt: new Date(), data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate export report data' });
  }
});

export default router;
