const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');

const GUIDE_READY_TEMPLATE = path.join(
  __dirname,
  '../../../client/src/email-templates/guide-ready.html'
);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createTransporter() {
  if (!config.smtpUser || !config.smtpPass) return null;
  console.log(`[email] SMTP: ${config.smtpHost}:${config.smtpPort} user=${config.smtpUser}`);
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

async function sendVerificationEmail(email, name, token) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn(`[email] SMTP not configured — verification token for ${email}: ${token}`);
    return;
  }
  const link = `${config.appUrl}/verify-email?token=${token}`;
  try {
    await transporter.sendMail({
      from: config.contactFromEmail || config.smtpUser,
      to: email,
      subject: 'Verify your email — StructureMyLearning',
      text: `Hi ${name},\n\nPlease verify your email address by clicking the link below:\n\n${link}\n\nThe link expires in 7 days. If you didn't create an account, you can ignore this email.`,
      html: `<p>Hi ${name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>The link expires in 7 days. If you didn't create an account, you can ignore this email.</p>`,
    });
  } catch (err) {
    console.error('[email] Failed to send verification email:', err.message);
  }
}

async function sendGuideReadyEmail({ email, name, guideTitle, guideUrl, sections = [] }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn(`[email] SMTP not configured — guide ready for ${email}: ${guideUrl}`);
    return;
  }

  const topicRows = sections.slice(0, 8).map((s) => `
    <tr>
      <td style="padding:5px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:7px;height:7px;background:#0f766e;border-radius:50%;vertical-align:middle;">&nbsp;</td>
            <td style="padding-left:10px;font-size:14px;color:#334155;line-height:1.4;">${escapeHtml(s.title)}</td>
          </tr>
        </table>
      </td>
    </tr>`).join('');

  const topicsBlock = sections.length > 0 ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#f8fafc;border-radius:10px;margin-bottom:28px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;">Topics covered</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${topicRows}
        </table>
      </td></tr>
    </table>` : '';

  console.log(`[email] Loading template: ${GUIDE_READY_TEMPLATE}`);
  let html;
  try {
    html = fs.readFileSync(GUIDE_READY_TEMPLATE, 'utf8')
      .replace(/\{\{APP_URL\}\}/g, escapeHtml(config.appUrl))
      .replace(/\{\{NAME\}\}/g, escapeHtml(name))
      .replace(/\{\{GUIDE_TITLE\}\}/g, escapeHtml(guideTitle))
      .replace(/\{\{GUIDE_URL\}\}/g, escapeHtml(guideUrl))
      .replace(/\{\{TOPICS_BLOCK\}\}/g, topicsBlock);
    console.log(`[email] Template loaded (${html.length} bytes, ${sections.length} topic(s))`);
  } catch (err) {
    console.error('[email] Failed to load guide-ready template:', err.message);
    throw err;
  }

  const topicsText = sections.length > 0
    ? `\nTopics covered:\n${sections.slice(0, 8).map((s) => `  • ${s.title}`).join('\n')}\n`
    : '';
  const text = `Hi ${name},\n\nYour guide "${guideTitle}" is ready!${topicsText}\nOpen it here: ${guideUrl}\n\n— StructureMyLearning`;

  console.log(`[email] Sending to=${email} from=${config.contactFromEmail || config.smtpUser}`);
  try {
    const info = await transporter.sendMail({
      from: config.contactFromEmail || config.smtpUser,
      to: email,
      subject: `Your guide is ready — ${guideTitle}`,
      text,
      html,
    });
    console.log(`[email] Accepted — messageId=${info.messageId} response="${info.response}"`);
  } catch (err) {
    console.error(`[email] sendMail failed — code=${err.code} response=${err.response || err.message}`);
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendGuideReadyEmail };
