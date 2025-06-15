import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { supabase } from '@/lib/supabase';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { queryId, email, name, service, data } = await request.json();

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `Council Service Request Confirmation - ${service}`,
      html: generateEmailTemplate(queryId, name, service, data),
    };

    await sgMail.send(msg);

    // Update query to mark email as sent
    await supabase
      .from('queries')
      .update({ email_sent: true })
      .eq('id', queryId);

    return NextResponse.json({ success: true, message: 'Confirmation email sent' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}

function generateEmailTemplate(queryId: string, name: string, service: string, data: Record<string, any>): string {
  const dataRows = Object.entries(data)
    .map(([key, value]) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${formatFieldName(key)}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${value}</td></tr>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Council Service Request Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Council Services</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Request Confirmation</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea; margin-top: 0;">Hello ${name},</h2>
            
            <p>Thank you for contacting us through our AI assistant Guru. We have received your <strong>${service}</strong> request and it has been logged in our system.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #495057;">Request Details</h3>
                <p><strong>Reference Number:</strong> ${queryId.substring(0, 8).toUpperCase()}</p>
                <p><strong>Service Type:</strong> ${service}</p>
                <p><strong>Date Submitted:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h3 style="color: #495057;">Information Provided</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${dataRows}
            </table>
            
            <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0c5460;">What Happens Next?</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Our team will review your request within 2-3 business days</li>
                    <li>You may be contacted for additional information if needed</li>
                    <li>We'll update you via email on the progress of your request</li>
                    <li>You can reference this confirmation using your reference number</li>
                </ul>
            </div>
            
            <div style="border-top: 2px solid #667eea; padding-top: 20px; margin-top: 30px; text-align: center; color: #666;">
                <p>Need to make changes or have questions?</p>
                <p>Contact us at: <a href="tel:+441234567890" style="color: #667eea;">+44 123 456 7890</a></p>
                <p style="font-size: 14px; margin-top: 20px;">
                    This is an automated confirmation email from the Council Services AI Assistant.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}