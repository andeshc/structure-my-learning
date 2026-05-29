const nodemailer = require('nodemailer');
const config = require('../config');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createTransporter() {
  if (!config.smtpUser || !config.smtpPass) return null;
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your guide is ready</title>
</head>
<body style="margin:0;padding:0;background:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e2e8f0;">
    <tr><td align="center" style="padding:36px 16px 36px;">

      <!-- Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr><td style="background:#0f766e;padding:26px 32px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- Ascending-pill logomark -->
              <td style="width:50px;vertical-align:middle;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-right:3px;vertical-align:bottom;">
                      <div style="width:12px;height:5px;background:rgba(255,255,255,0.45);border-radius:3px;">&nbsp;</div>
                    </td>
                    <td style="padding-right:3px;vertical-align:bottom;padding-bottom:4px;">
                      <div style="width:12px;height:5px;background:rgba(255,255,255,0.70);border-radius:3px;">&nbsp;</div>
                    </td>
                    <td style="vertical-align:bottom;padding-bottom:8px;">
                      <div style="width:12px;height:5px;background:#ffffff;border-radius:3px;">&nbsp;</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="vertical-align:middle;">
                <span style="font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">StructureMyLearning</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Sub-header band -->
        <tr><td style="background:#0d9488;padding:10px 32px;">
          <span style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:999px;
            padding:3px 12px;font-size:11px;font-weight:700;color:#ccfbf1;
            letter-spacing:0.08em;text-transform:uppercase;">Guide ready</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 32px 28px;">
          <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Hi ${escapeHtml(name)},</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.25;">
            ${escapeHtml(guideTitle)}
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.65;">
            Your learning guide is ready. We've structured it into topics and lessons — open it whenever you're ready to start.
          </p>

          ${topicsBlock}

          <!-- CTA button -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-radius:10px;background:#0f766e;">
              <a href="${guideUrl}"
                style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;
                  color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                Open my guide &rarr;
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            You're receiving this because you created a guide on
            <a href="${escapeHtml(config.appUrl)}" style="color:#0f766e;text-decoration:none;">StructureMyLearning</a>.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const topicsText = sections.length > 0
    ? `\nTopics covered:\n${sections.slice(0, 8).map((s) => `  • ${s.title}`).join('\n')}\n`
    : '';

  const text = `Hi ${name},\n\nYour guide "${guideTitle}" is ready!${topicsText}\nOpen it here: ${guideUrl}\n\n— StructureMyLearning`;

  try {
    await transporter.sendMail({
      from: config.contactFromEmail || config.smtpUser,
      to: email,
      subject: `Your guide is ready — ${guideTitle}`,
      text,
      html,
    });
  } catch (err) {
    console.error('[email] Failed to send guide ready email:', err.message);
  }
}

module.exports = { sendVerificationEmail, sendGuideReadyEmail };
