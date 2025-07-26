import axios from 'axios';

/**
 * Send webhook notification
 * @param event - The event name (e.g., 'invite.created')
 * @param data - The data to send with the webhook
 */
export const sendWebhook = async (event: string, data: any) => {
  try {
    const webhookUrl = process.env.WEBHOOK_URL;

    // Skip webhook in development or if URL not provided
    if (!webhookUrl || process.env.NODE_ENV !== 'production') {
      console.warn(`[webhook] Skipped (${process.env.NODE_ENV} mode or missing URL)`);
      return;
    }

    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    console.log(`[webhook] Sending "${event}" to ${webhookUrl}`);

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SaaS-Dashboard-Webhook/1.0',
      },
      timeout: 5000, // 5 seconds
    });

    console.log(`[webhook] Sent successfully with status ${response.status}`);
    return response.data;

  } catch (error) {
    console.error('[webhook] Error sending webhook');

    if (axios.isAxiosError(error)) {
      console.error('Axios error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    } else {
      console.error('Unknown error:', error);
    }

    // Do not throw to prevent app crash
    return null;
  }
};
