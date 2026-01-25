/**
 * Email service for sending emails
 * Uses nodemailer for email delivery
 */

import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
};

/**
 * Create email transporter
 */
function createTransporter() {
  // If no SMTP credentials, use a test account (for development)
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    console.warn('⚠️  SMTP credentials not configured. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: EMAIL_CONFIG.auth,
  });
}

/**
 * Send OTP email to user
 */
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const transporter = createTransporter();
  
  if (!transporter) {
    // In development, log the OTP instead of sending email
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
      return;
    }
    throw new Error('Email service not configured');
  }

  const mailOptions = {
    from: `"Revalidation Tracker" <${EMAIL_CONFIG.auth.user}>`,
    to: email,
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Thank you for registering with Revalidation Tracker!</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Revalidation Tracker - Professional Compliance Tracking</p>
      </div>
    `,
    text: `
      Email Verification

      Thank you for registering with Revalidation Tracker!

      Your verification code is: ${otp}

      This code will expire in 10 minutes.

      If you didn't request this code, please ignore this email.

      Revalidation Tracker - Professional Compliance Tracking
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send verification email');
  }
}
