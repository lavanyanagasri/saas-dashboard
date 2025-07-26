import express from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { sendWebhook } from '../utils/webhook';
import { sendInviteEmail } from '../utils/email';


const router = express.Router();

/**
 * POST /api/invites
 * Create a new invite (Admin/Manager only)
 * After successful creation, triggers a webhook notification
 */
router.post('/', 
  authenticateToken, 
  requireRole(['ADMIN', 'MANAGER']), 
  auditLog('INVITE_SENT'),
  async (req, res) => {
    try {
      const { email, role = 'MEMBER' } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate role
      const validRoles = ['ADMIN', 'MANAGER', 'MEMBER'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
      }

      // Check if user is already in the organization
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          organizationId: req.user!.organizationId
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User is already a member of this organization' });
      }

      // Check if there's already a pending invite
      const existingInvite = await prisma.invite.findFirst({
        where: {
          email,
          organizationId: req.user!.organizationId,
          acceptedAt: null,
          expiresAt: { gt: new Date() }
        }
      });

      if (existingInvite) {
        return res.status(400).json({ error: 'An active invite already exists for this email' });
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invite in database
      const invite = await prisma.invite.create({
        data: {
          email,
          token,
          role,
          organizationId: req.user!.organizationId,
          senderId: req.user!.id,
          expiresAt
        },
        include: {
          organization: {
            select: { id: true, name: true }
          },
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      console.log(`Invite created successfully: ${invite.id}`);

      // Prepare webhook payload
      const webhookData = {
        inviteId: invite.id,
        email: invite.email,
        role: invite.role,
        orgId: invite.organizationId,
        orgName: invite.organization.name,
        senderName: `${invite.sender.firstName} ${invite.sender.lastName}`,
        senderEmail: invite.sender.email,
        expiresAt: invite.expiresAt.toISOString(),
        acceptUrl: `${process.env.FRONTEND_URL}/accept-invite/${invite.token}`
      };

      // Send webhook notification asynchronously
      // This runs in the background and doesn't block the response
      setImmediate(async () => {
        try {
          await sendWebhook('invite.created', webhookData);
          console.log(`Webhook sent for invite: ${invite.id}`);

           await sendInviteEmail({
      to: invite.email,
      organizationName: invite.organization.name,
      inviteUrl: webhookData.acceptUrl,
    });
        } catch (error) {
          console.error(`Failed to send webhook for invite ${invite.id}:`, error);
        }
      });

      // Return success response immediately
      res.status(201).json({
        message: 'Invite sent successfully',
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt
        }
      });

    } catch (error) {
      console.error('Invite creation error:', error);
      res.status(500).json({ error: 'Failed to create invite' });
    }
  }
);

/**
 * GET /api/invites
 * Get all invites for the organization (Admin/Manager only)
 */
router.get('/', 
  authenticateToken, 
  requireRole(['ADMIN', 'MANAGER']), 
  async (req, res) => {
    try {
      const invites = await prisma.invite.findMany({
        where: {
          organizationId: req.user!.organizationId
        },
        include: {
          sender: {
            select: { firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ invites });
    } catch (error) {
      console.error('Fetch invites error:', error);
      res.status(500).json({ error: 'Failed to fetch invites' });
    }
  }
);

/**
 * POST /api/invites/accept/:token
 * Accept an invite using the token
 */
router.post('/accept/:token', auditLog('INVITE_ACCEPTED'), async (req, res) => {
  try {
    const { token } = req.params;
    const { password, firstName, lastName } = req.body;

    // Validate required fields
    if (!password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Password, first name, and last name are required' });
    }

    // Find the invite
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        organization: true
      }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invalid or expired invite' });
    }

    // Check if invite has expired
    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }

    // Check if invite has already been accepted
    if (invite.acceptedAt) {
      return res.status(400).json({ error: 'Invite has already been accepted' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user and mark invite as accepted in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email: invite.email,
          password: hashedPassword,
          firstName,
          lastName,
          role: invite.role,
          organizationId: invite.organizationId
        }
      });

      // Mark invite as accepted
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() }
      });

      return user;
    });

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign(
      { userId: result.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = result;

    res.json({
      message: 'Invite accepted successfully',
      user: userWithoutPassword,
      organization: invite.organization,
      token: jwtToken
    });

  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

/**
 * DELETE /api/invites/:id
 * Cancel/delete an invite (Admin only)
 */
router.delete('/:id', 
  authenticateToken, 
  requireRole(['ADMIN']), 
  auditLog('INVITE_CANCELLED'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify invite belongs to user's organization
      const invite = await prisma.invite.findFirst({
        where: {
          id,
          organizationId: req.user!.organizationId
        }
      });

      if (!invite) {
        return res.status(404).json({ error: 'Invite not found' });
      }

      // Delete the invite
      await prisma.invite.delete({
        where: { id }
      });

      res.json({ message: 'Invite cancelled successfully' });
    } catch (error) {
      console.error('Cancel invite error:', error);
      res.status(500).json({ error: 'Failed to cancel invite' });
    }
  }
);

export default router;