import { Resend } from "resend";
import { verificationEmailTemplate } from "./templates/verificationEmail.js";
import { passwordResetEmailTemplate } from "./templates/passwordResetEmail.js";

// Lazy getter — instantiated on first use so the server starts even without
// RESEND_API_KEY set (useful in development before the .env is configured).
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your .env file (see example.env)."
    );
  }
  return new Resend(process.env.RESEND_API_KEY);
};

const FROM_ADDRESS = () =>
  process.env.EMAIL_FROM || "Banavoo <noreply@banavoo.in>";

/**
 * sendVerificationEmail — sends the 6-digit OTP email to the user.
 *
 * @param {string} to       - recipient email
 * @param {string} fullName - recipient name
 * @param {string} otp      - plain 6-digit OTP
 */
export const sendVerificationEmail = async (to, fullName, otp) => {
  const { html, text } = verificationEmailTemplate(fullName, otp);

  await getResend().emails.send({
    from: FROM_ADDRESS(),
    to,
    subject: "Verify your Banavoo account",
    html,
    text,
  });
};

/**
 * sendPasswordResetEmail — sends the password reset link.
 *
 * @param {string} to        - recipient email
 * @param {string} fullName  - recipient name
 * @param {string} resetUrl  - full reset URL including token
 */
export const sendPasswordResetEmail = async (to, fullName, resetUrl) => {
  const { html, text } = passwordResetEmailTemplate(fullName, resetUrl);

  await getResend().emails.send({
    from: FROM_ADDRESS(),
    to,
    subject: "Reset your Banavoo password",
    html,
    text,
  });
};
