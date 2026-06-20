import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config';
import { AuthenticatedRequest, authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

// GET /api/users - List users (Admin only)
router.get('/', authenticateToken, requirePermission('users', 'view'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users - Create user (Admin only)
router.post('/', authenticateToken, requirePermission('users', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isActive: true
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'create',
        entityType: 'user',
        entityId: user.id,
        newValue: JSON.stringify({ email, name, role })
      }
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', authenticateToken, requirePermission('users', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, role, isActive, password } = req.body;

  try {
    const oldUser = await prisma.user.findUnique({ where: { id } });
    if (!oldUser) return res.status(404).json({ error: 'User not found' });

    let passwordHash = oldUser.passwordHash;
    if (password) {
      passwordHash = bcrypt.hashSync(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: name !== undefined ? name : oldUser.name,
        role: role !== undefined ? role : oldUser.role,
        isActive: isActive !== undefined ? isActive : oldUser.isActive,
        passwordHash
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'update',
        entityType: 'user',
        entityId: user.id,
        oldValue: JSON.stringify({ name: oldUser.name, role: oldUser.role, isActive: oldUser.isActive }),
        newValue: JSON.stringify({ name: user.name, role: user.role, isActive: user.isActive })
      }
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', authenticateToken, requirePermission('users', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot self-delete logged in administrator' });
    }

    await prisma.user.delete({ where: { id } });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'delete',
        entityType: 'user',
        entityId: id,
        oldValue: JSON.stringify({ email: user.email, name: user.name, role: user.role })
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/users/permissions - Fetch permission matrix (Admin/Owner only)
router.get('/permissions/matrix', authenticateToken, async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { role: 'asc' },
        { module: 'asc' }
      ]
    });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions matrix' });
  }
});

// PUT /api/users/permissions/matrix - Update permission matrix cell
router.put('/permissions/matrix', authenticateToken, requirePermission('users', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { role, module: modName, action, value } = req.body; // e.g. { role: 'sales', module: 'purchases', action: 'canView', value: true }

  if (!role || !modName || !action || value === undefined) {
    return res.status(400).json({ error: 'Role, module name, action field, and value are required' });
  }

  try {
    // Find permission record
    const perm = await prisma.permission.findFirst({
      where: { role, module: modName }
    });

    let updatedPerm;
    if (perm) {
      updatedPerm = await prisma.permission.update({
        where: { id: perm.id },
        data: { [action]: !!value }
      });
    } else {
      updatedPerm = await prisma.permission.create({
        data: {
          role,
          module: modName,
          [action]: !!value
        }
      });
    }

    // Log Audit
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'update',
        entityType: 'permission',
        entityId: updatedPerm.id,
        newValue: `Updated ${role} permission for ${modName}: set ${action} to ${value}`
      }
    });

    res.json(updatedPerm);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update permission setting' });
  }
});

export default router;
