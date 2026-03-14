import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

// Create a transporter using SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Function to send welcome email
export const sendWelcomeEmail = async (email, name) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "STHALS <noreply@sthals.in>",
      to: email,
      subject: "Welcome to STHALS.IN - Your PG Registration is Complete!",

      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to STHALS.IN</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                .container {
                    background-color: #ffffff;
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 10px;
                }
                .greeting {
                    font-size: 18px;
                    margin-bottom: 20px;
                    color: #2c3e50;
                }
                .content {
                    margin-bottom: 30px;
                }
                .highlight {
                    background-color: #e8f4fd;
                    padding: 15px;
                    border-left: 4px solid #3498db;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 14px;
                    color: #666;
                }
                .btn {
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #3498db;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .small-text {
                    font-size: 12px;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">STHALS.IN</div>
                    <h1 style="color: #3498db;">Welcome Aboard! 🎉</h1>
                </div>
                
                <div class="greeting">
                    Hello ${name},
                </div>
                
                <div class="content">
                    <p>We're thrilled to welcome you to STHALS.IN! Your registration as a PG owner has been successfully completed.</p>
                    
                    <div class="highlight">
                        <strong>Your Account Details:</strong><br>
                        • Name: ${name}<br>
                        • Email: ${email}<br>
                        • Registration Date: ${new Date().toLocaleDateString()}
                    </div>
                    
                    <p><strong>What's Next?</strong></p>
                    <ul>
                        <li>Log in to your dashboard to manage your PG listings</li>
                        <li>Add your PG details and room information</li>
                        <li>Start receiving booking requests from tenants</li>
                        <li>Manage bookings and communications with ease</li>
                    </ul>
                    
                    <p>Our platform makes PG management simple and efficient. You'll be able to:</p>
                    <ul>
                        <li>Track room availability in real-time</li>
                        <li>Manage tenant requests and bookings</li>
                        <li>Update PG details and amenities</li>
                        <li>Receive notifications for new requests</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || "https://www.sthals.in"}" class="btn">Visit Your Dashboard</a>
                </div>
                
                <div class="footer">
                    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    <p>Best regards,<br>
                    The STHALS.IN Team</p>
                    
                    <div class="small-text">
                        <p>This is an automated message from STHALS.IN. Please do not reply to this email.</p>
                        <p>If you received this email by mistake, please ignore it or contact our support team.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);

    // Provide helpful error messages for common issues
    if (error.responseCode === 535) {
      console.error(
        "❌ Gmail Authentication Error: Please check your credentials",
      );
      console.error("💡 For Gmail users:");
      console.error("  1. Enable 2-Factor Authentication");
      console.error(
        "  2. Generate an App Password: https://support.google.com/accounts/answer/185833",
      );
      console.error(
        "  3. Use the App Password in SMTP_PASS, not your regular password",
      );
      console.error(
        "  4. Make sure 'Less secure app access' is disabled (use App Passwords instead)",
      );
    } else if (error.code === "ECONNECTION") {
      console.error("❌ Connection Error: Unable to connect to SMTP server");
      console.error(
        "💡 Check your internet connection and SMTP server settings",
      );
    } else if (error.code === "ETIMEDOUT") {
      console.error("❌ Timeout Error: SMTP server connection timed out");
      console.error("💡 Check your SMTP host and port settings");
    }

    throw new Error("Failed to send welcome email");
  }
};

// Function to send verification email (optional enhancement)
export const sendVerificationEmail = async (email, name, verificationLink) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || "STHALS.IN",
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      },
      to: email,
      subject: "Verify Your Email Address - STHALS.IN",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
                .btn { display: inline-block; padding: 12px 30px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">STHALS.IN</div>
                    <h1 style="color: #27ae60;">Please Verify Your Email</h1>
                </div>
                
                <p>Hello ${name},</p>
                
                <p>Thank you for registering with STHALS.IN! To complete your registration, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center;">
                    <a href="${verificationLink}" class="btn">Verify Email Address</a>
                </div>
                
                <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${verificationLink}</p>
                
                <p>This verification link will expire in 24 hours for security reasons.</p>
                
                <p>If you didn't register for STHALS.IN, please ignore this email.</p>
                
                <p>Best regards,<br>
                The STHALS.IN Team</p>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully to:", email);
    return result;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};
