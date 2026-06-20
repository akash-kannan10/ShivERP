import { Router } from 'express';
import { prisma } from '../config';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

// GET /api/customers - Get all customers + computed stats
router.get('/', authenticateToken, requirePermission('sales', 'view'), async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        salesOrders: true
      },
      orderBy: { name: 'asc' }
    });

    const customersWithMetrics = customers.map(c => {
      const orders = c.salesOrders;
      const totalPurchases = orders
        .filter(o => o.status === 'fully_delivered')
        .reduce((sum, order) => sum + order.totalAmount, 0);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        createdAt: c.createdAt,
        ordersCount: orders.length,
        totalPurchases
      };
    });

    res.json(customersWithMetrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// POST /api/customers
router.post('/', authenticateToken, requirePermission('sales', 'create'), async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Customer name is required' });

  try {
    const customer = await prisma.customer.create({
      data: { name, phone: phone || '', email: email || '', address: address || '' }
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticateToken, requirePermission('sales', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: { name, phone, email, address }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authenticateToken, requirePermission('sales', 'delete'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.customer.delete({ where: { id } });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer. Ensure it is not linked to any Sales Orders.' });
  }
});

export default router;
