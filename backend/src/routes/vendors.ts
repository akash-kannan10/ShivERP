import { Router } from 'express';
import { prisma } from '../config';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

// GET /api/vendors - Get all vendors + computed statistics
router.get('/', authenticateToken, requirePermission('raw_materials', 'view'), async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        purchaseOrders: true
      },
      orderBy: { name: 'asc' }
    });

    // Compute vendor metrics
    const vendorsWithMetrics = vendors.map(v => {
      const orders = v.purchaseOrders;
      const completedOrders = orders.filter(o => o.status === 'fully_received');
      
      // Calculate Average Delivery Time (in days)
      let totalDeliveryDays = 0;
      let count = 0;

      for (const order of completedOrders) {
        // If order expected/actual dates exist
        const orderDate = new Date(order.orderDate).getTime();
        const receiveDate = new Date(order.updatedAt).getTime(); // assume updatedAt is receive date when fully received
        const diffDays = Math.ceil((receiveDate - orderDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          totalDeliveryDays += diffDays;
          count++;
        }
      }

      const avgDeliveryTime = count > 0 ? Number((totalDeliveryDays / count).toFixed(1)) : 5.0; // default 5 days

      return {
        id: v.id,
        name: v.name,
        phone: v.phone,
        email: v.email,
        address: v.address,
        createdAt: v.createdAt,
        purchaseHistoryCount: orders.length,
        averageDeliveryTime: avgDeliveryTime
      };
    });

    res.json(vendorsWithMetrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// POST /api/vendors
router.post('/', authenticateToken, requirePermission('raw_materials', 'create'), async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Vendor name is required' });

  try {
    const vendor = await prisma.vendor.create({
      data: { name, phone: phone || '', email: email || '', address: address || '' }
    });
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// PUT /api/vendors/:id
router.put('/:id', authenticateToken, requirePermission('raw_materials', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;

  try {
    const vendor = await prisma.vendor.update({
      where: { id },
      data: { name, phone, email, address }
    });
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// DELETE /api/vendors/:id
router.delete('/:id', authenticateToken, requirePermission('raw_materials', 'delete'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.vendor.delete({ where: { id } });
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vendor. Ensure it is not linked to any products or POs.' });
  }
});

export default router;
