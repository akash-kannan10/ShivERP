import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, prisma } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = decoded as { id: string; email: string; role: string; name: string };
    next();
  });
}

export function requirePermission(moduleName: string, action: 'view' | 'create' | 'edit' | 'delete') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User context not found' });
    }

    const { role } = req.user;

    // Admin role has bypass for all actions
    if (role === 'admin') {
      return next();
    }

    try {
      const permission = await prisma.permission.findFirst({
        where: {
          role,
          module: moduleName,
        },
      });

      if (!permission) {
        return res.status(403).json({ error: `No permissions configured for role ${role} on module ${moduleName}` });
      }

      let isAllowed = false;
      if (action === 'view') isAllowed = permission.canView;
      else if (action === 'create') isAllowed = permission.canCreate;
      else if (action === 'edit') isAllowed = permission.canEdit;
      else if (action === 'delete') isAllowed = permission.canDelete;

      if (!isAllowed) {
        return res.status(403).json({ error: `Forbidden: ${role} does not have ${action} permissions on ${moduleName}` });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to verify permission access' });
    }
  };
}
