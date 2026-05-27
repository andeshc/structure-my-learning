const nodemailer = require('nodemailer');
const config = require('../config');

function createTransporter() {
  if (!config.smtpUser || !config.smtpPass) return null;
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    family: 4,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

async function sendVerificationEmail(email, name, token) {
  console.log(`[email] Attempting to send verification email to ${email}`);
  console.log(`[email] SMTP config — host: ${config.smtpHost}, port: ${config.smtpPort}, user: ${config.smtpUser}, passSet: ${!!config.smtpPass}`);

  const transporter = createTransporter();
  if (!transporter) {
    console.warn(`[email] SMTP not configured — verification token for ${email}: ${token}`);
    return;
  }

  try {
    console.log('[email] Verifying SMTP connection…');
    await transporter.verify();
    console.log('[email] SMTP connection verified OK');
  } catch (verifyErr) {
    console.error('[email] SMTP verify failed:', verifyErr.message);
    console.error('[email] SMTP verify error code:', verifyErr.code);
    console.error('[email] SMTP verify full error:', verifyErr);
    return;
  }

  const link = `${config.appUrl}/verify-email?token=${token}`;
  try {
    const info = await transporter.sendMail({
      from: config.contactFromEmail || config.smtpUser,
      to: email,
      subject: 'Verify your email — StructureMyLearning',
      text: `Hi ${name},\n\nPlease verify your email address by clicking the link below:\n\n${link}\n\nThe link expires in 7 days. If you didn't create an account, you can ignore this email.`,
      html: `<p>Hi ${name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>The link expires in 7 days. If you didn't create an account, you can ignore this email.</p>`,
    });
    console.log('[email] Verification email sent, messageId:', info.messageId);
  } catch (err) {
    console.error('[email] Failed to send verification email:', err.message);
    console.error('[email] Send error code:', err.code);
    console.error('[email] Send error full:', err);
  }
}

module.exports = { sendVerificationEmail };
