/**
 * verificationEmailTemplate — HTML + plain-text for the OTP email.
 */
export const verificationEmailTemplate = (fullName, otp) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Banavoo account</title>
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
                Thanks for signing up for Banavoo! Use the verification code below to confirm your email address.
              </p>
              <!-- OTP box -->
              <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Your verification code</p>
                <p style="margin:0;font-size:40px;font-weight:700;color:#3b82f6;letter-spacing:8px;">${otp}</p>
              </div>
              <p style="margin:0 0 8px;font-size:14px;color:#64748b;">
                This code expires in <strong>10 minutes</strong>.
              </p>
              <p style="margin:0;font-size:14px;color:#64748b;">
                If you didn't create a Banavoo account, you can safely ignore this email.
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

Your Banavoo email verification code is: ${otp}

This code expires in 10 minutes.

If you didn't create a Banavoo account, you can safely ignore this email.

— Banavoo Team`;

  return { html, text };
};
