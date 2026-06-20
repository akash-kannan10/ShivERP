import { Router } from 'express';
import { prisma } from '../config';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

// GET /api/audit/logs - Get system audit logs (Admin/Owner only)
router.get('/logs', authenticateToken, requirePermission('audit_logs', 'view'), async (req, res) => {
  const { entityType, action } = req.query;
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: entityType ? String(entityType) : undefined,
        action: action ? String(action) : undefined
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Cap at 100 for performance
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/audit/timeline - Get recent employee activities timeline
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const activities = await prisma.employeeActivity.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

export default router;
