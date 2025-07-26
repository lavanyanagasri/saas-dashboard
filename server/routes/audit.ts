import express from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/audit
 * Get audit logs for the organization (Admin/Manager only)
 */
router.get('/', 
  authenticateToken, 
  requireRole(['ADMIN', 'MANAGER']), 
  async (req, res) => {
    try {
      const { page = 1, limit = 50, action, userId } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      
      // Build where clause
      const where: any = {
        organizationId: req.user!.organizationId
      };
      
      if (action) {
        where.action = { contains: String(action), mode: 'insensitive' };
      }
      
      if (userId) {
        where.userId = String(userId);
      }

      // Get audit logs with user details
      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      });

      // Get total count for pagination
      const total = await prisma.auditLog.count({ where });

      res.json({
        auditLogs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Fetch audit logs error:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

export default router;