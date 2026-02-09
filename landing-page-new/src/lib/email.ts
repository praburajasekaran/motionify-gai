import nodemailer from 'nodemailer';

/**
 * Email Service Configuration
 * 
 * Uses Mailtrap for development and (future) AWS SES or others for production.
 */

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.MAILTRAP_PORT || '2525', 10),
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
    },
});

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions) {
    const mailOptions = {
        from: '"Motionify" <hello@motionify.com>',
        ...options,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
}

/**
 * Send Welcome Email to Client
 */
export async function sendWelcomeEmail(data: {
    email: string;
    name: string;
    projectNumber: string;
    projectId: string;
}) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5174'}/login?email=${encodeURIComponent(data.email)}`;

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="https://motionify.studio/motionify-dark-logo.png" alt="Motionify Studio" width="180" style="display: inline-block;" />
      </div>
      <h1 style="color: #7c3aed;">Welcome to Motionify!</h1>
      <p>Hi ${data.name},</p>
      <p>We're excited to work with you on your project.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">Project Details</h2>
        <p style="margin-bottom: 5px;"><strong>Project Number:</strong> ${data.projectNumber}</p>
        <p style="margin-bottom: 0;"><strong>Status:</strong> Active</p>
      </div>
      
      <h3>Next Steps:</h3>
      <ol>
        <li>Our team will begin work on your project immediately</li>
        <li>You will receive updates on project milestones and deliverables</li>
        <li>You can track your project progress and view deliverables in your dashboard</li>
      </ol>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${loginUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Project</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions, feel free to reply to this email or contact us at hello@motionify.com
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        &copy; ${new Date().getFullYear()} Motionify. All rights reserved.
      </p>
    </div>
  `;

    return sendEmail({
        to: data.email,
        subject: `Welcome to Motionify - Project ${data.projectNumber}`,
        html,
    });
}
