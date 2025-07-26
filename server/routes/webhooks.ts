import express from 'express';
import { prisma } from '../prisma';

const router = express.Router();

/**
 * POST /api/webhooks/invite
 * Handle incoming webhook notifications for invite events
 * This endpoint receives webhooks sent by the /api/invites route
 */
router.post('/invite', async (req, res) => {
  try {
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { event, data, timestamp } = req.body;

    // Validate webhook payload
    if (!event || !data) {
      console.log('Invalid webhook payload - missing event or data');
      return res.status(400).json({ 
        error: 'Invalid webhook payload', 
        required: ['event', 'data'] 
      });
    }

    // Process different event types
    switch (event) {
      case 'invite.created':
        await handleInviteCreated(data);
        break;
      
      case 'invite.accepted':
        await handleInviteAccepted(data);
        break;
      
      case 'invite.expired':
        await handleInviteExpired(data);
        break;
      
      default:
        console.log(`Unknown webhook event: ${event}`);
        return res.status(400).json({ 
          error: 'Unknown event type', 
          received: event 
        });
    }

    // Log successful webhook processing
    console.log(`Successfully processed webhook: ${event}`);
    
    // Return success response
    res.status(200).json({ 
      message: 'Webhook processed successfully',
      event,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Handle invite.created webhook event
 * This could trigger email notifications, Slack messages, etc.
 */
async function handleInviteCreated(data: any) {
  try {
    console.log(`Processing invite.created for: ${data.email}`);
    
    // Example: Log the invite creation
    await prisma.auditLog.create({
      data: {
        action: 'WEBHOOK_INVITE_CREATED',
        details: {
          event: 'invite.created',
          inviteId: data.inviteId,
          email: data.email,
          role: data.role,
          orgName: data.orgName,
          senderEmail: data.senderEmail
        },
        organizationId: data.orgId,
        ipAddress: 'webhook',
        userAgent: 'webhook-processor'
      }
    });

    // Here you could add additional logic such as:
    // - Send email notification to the invited user
    // - Post to Slack channel
    // - Update external CRM systems
    // - Send SMS notification
    // - Update analytics/metrics

    console.log(`✅ Invite webhook processed for ${data.email}`);
    
    // Example email sending logic (commented out)
    /*
    await sendInviteEmail({
      to: data.email,
      subject: `You're invited to join ${data.orgName}`,
      template: 'invite',
      data: {
        orgName: data.orgName,
        senderName: data.senderName,
        role: data.role,
        acceptUrl: data.acceptUrl,
        expiresAt: data.expiresAt
      }
    });
    */

  } catch (error) {
    console.error('Error handling invite.created webhook:', error);
    throw error;
  }
}

/**
 * Handle invite.accepted webhook event
 */
async function handleInviteAccepted(data: any) {
  try {
    console.log(`Processing invite.accepted for: ${data.email}`);
    
    // Log the acceptance
    await prisma.auditLog.create({
      data: {
        action: 'WEBHOOK_INVITE_ACCEPTED',
        details: {
          event: 'invite.accepted',
          inviteId: data.inviteId,
          email: data.email,
          userId: data.userId
        },
        organizationId: data.orgId,
        ipAddress: 'webhook',
        userAgent: 'webhook-processor'
      }
    });

    console.log(`✅ Invite acceptance webhook processed for ${data.email}`);
  } catch (error) {
    console.error('Error handling invite.accepted webhook:', error);
    throw error;
  }
}

/**
 * Handle invite.expired webhook event
 */
async function handleInviteExpired(data: any) {
  try {
    console.log(`Processing invite.expired for: ${data.email}`);
    
    // Log the expiration
    await prisma.auditLog.create({
      data: {
        action: 'WEBHOOK_INVITE_EXPIRED',
        details: {
          event: 'invite.expired',
          inviteId: data.inviteId,
          email: data.email
        },
        organizationId: data.orgId,
        ipAddress: 'webhook',
        userAgent: 'webhook-processor'
      }
    });

    console.log(`✅ Invite expiration webhook processed for ${data.email}`);
  } catch (error) {
    console.error('Error handling invite.expired webhook:', error);
    throw error;
  }
}

/**
 * GET /api/webhooks/test
 * Test endpoint to verify webhook handling is working
 */
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/webhooks/invite - Handle invite webhooks'
    ]
  });
});

export default router;