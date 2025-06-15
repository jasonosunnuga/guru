// src/lib/sendgrid.ts

import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendCustomerEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
) {
  const msg: any = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject,
    text,
  };
  if (html) msg.html = html;

  try {
    await sgMail.send(msg);
  } catch (err: any) {
    console.error('SendGrid send error:', err.response?.body || err);
    throw err;
  }
}
