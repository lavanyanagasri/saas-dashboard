import express from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/users
 * Get all users in the organization (Admin/Manager only)
 */
router.get('/', 
  authenticateToken, 
  requireRole(['ADMIN', 'MANAGER']), 
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          organizationId: req.user!.organizationId
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ users });
    } catch (error) {
      console.error('Fetch users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);

/**
 * PUT /api/users/:id/role
 * Update user role (Admin only)
 */
router.put('/:id/role', 
  authenticateToken, 
  requireRole(['ADMIN']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Validate role
      const validRoles = ['ADMIN', 'MANAGER', 'MEMBER'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
      }

      // Check if user exists in the same organization
      const user = await prisma.user.findFirst({
        where: {
          id,
          organizationId: req.user!.organizationId
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent self role change if it would remove admin privileges
      if (user.id === req.user!.id && role !== 'ADMIN') {
        return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
      }

      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      });

      res.json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

export default router;