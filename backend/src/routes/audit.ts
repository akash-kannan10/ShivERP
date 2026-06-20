import { Router } from 'express';
import { prisma } from '../config';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

// GET /api/audit - Get formatted logs (Admin/Owner/all authorized users can view)
router.get('/', authenticateToken, async (req, res) => {
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
      take: 100
    });

    const logs = activities.map(act => {
      let description = '';
      switch (act.activityType) {
        case 'login':
          description = `${act.user.name} signed in to the workshop dashboard.`;
          break;
        case 'logout':
          description = `${act.user.name} left the workshop dashboard.`;
          break;
        case 'so_created':
          description = `Confirmed Sales Order ${act.referenceId}.`;
          break;
        case 'po_created':
          description = `Raised Procurement PO ${act.referenceId}.`;
          break;
        case 'mo_completed':
          description = `Completed production for Manufacturing Order ${act.referenceId}.`;
          break;
        case 'delivery_completed':
          description = `Dispatched deliveries for Sales Order ${act.referenceId}.`;
          break;
        default:
          description = `Performed action: ${act.activityType} on ${act.referenceId || 'system'}.`;
      }

      return {
        id: act.id,
        createdAt: act.createdAt,
        user: act.user,
        activityType: act.activityType,
        referenceId: act.referenceId,
        description
      };
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

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
      take: 100
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
