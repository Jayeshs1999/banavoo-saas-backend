/**
 * passwordResetEmailTemplate — HTML + plain-text for the password reset email.
 */
export const passwordResetEmailTemplate = (fullName, resetUrl) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Banavoo password</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#3b82f6;padding:24px 40px;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Banavoo</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi <strong>${fullName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
                We received a request to reset your Banavoo password. Click the button below to set a new password.
              </p>
              <!-- CTA button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                  Reset Password
                </a>
              </div>
              <p style="margin:0 0 8px;font-size:14px;color:#64748b;">
                This link expires in <strong>1 hour</strong>.
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#64748b;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not change.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all;">
                Or copy this link: ${resetUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Banavoo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${fullName},

We received a request to reset your Banavoo password.

Reset your password here: ${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

— Banavoo Team`;

  return { html, text };
};
