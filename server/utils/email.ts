import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type SendInviteEmailProps = {
  to: string;
  organizationName: string;
  inviteUrl: string;
};

export async function sendInviteEmail({
  to,
  organizationName,
  inviteUrl,
}: SendInviteEmailProps) {
  try {
    const response = await resend.emails.send({
      from: 'YourApp <noreply@yourdomain.com>',
      to, // this must be a string
      subject: `You're invited to join ${organizationName}!`,
      html: `<p>Hello,</p>
        <p>You have been invited to join <strong>${organizationName}</strong>.</p>
        <p><a href="${inviteUrl}">Click here</a> to accept your invite.</p>
        <p>This invite will expire in 7 days.</p>`,
    });

    return response;
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
