import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware';
import { CopilotService } from '../services/copilotService';

const router = Router();

// POST /api/copilot/query
router.post('/query', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question string is required' });
  }

  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    const response = await CopilotService.queryCopilot(question, userRole, userId);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process Copilot query' });
  }
});

export default router;
