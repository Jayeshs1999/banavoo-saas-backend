import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

// Shared Resend sender address
const FROM_ADDRESS = "BEDWALE <noreply@bedwale.in>";

// Super-admin always receives a CC on every new booking notification
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "jayeshsevatkar55@gmail.com";

// Function to send welcome email
export const sendWelcomeEmail = async (email, name) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "BEDWALE <noreply@bedwale.in>",
      to: email,
      subject: "Welcome to BEDWALE.IN - Your PG Registration is Complete!",

      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to BEDWALE.IN</title>
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
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #3498db;">Welcome Aboard! 🎉</h1>
                </div>
                
                <div class="greeting">
                    Hello ${name},
                </div>
                
                <div class="content">
                    <p>We're thrilled to welcome you to BEDWALE.IN! Your registration as a PG owner has been successfully completed.</p>
                    
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
                    <a href="${process.env.FRONTEND_URL || "https://www.bedwale.in"}" class="btn">Visit Your Dashboard</a>
                </div>
                
                <div class="footer">
                    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    <p>Best regards,<br>
                    The BEDWALE.IN Team</p>
                    
                    <div class="small-text">
                        <p>This is an automated message from BEDWALE.IN. Please do not reply to this email.</p>
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

// ─────────────────────────────────────────────────────────────
// Welcome email for USERS (tenants looking for PG)
// Green theme — different from the admin PG-owner welcome above
// ─────────────────────────────────────────────────────────────
export const sendUserWelcomeEmail = async (email, firstName, lastName) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fullName = `${firstName} ${lastName || ""}`.trim();

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Welcome to BedWale.in — Your account is ready! 🏠",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to BedWale.in</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;padding:32px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #d1fae5;max-width:600px;width:100%;">

        <!-- Header banner -->
        <tr>
          <td style="background:linear-gradient(135deg,#16a34a 0%,#059669 60%,#0d9488 100%);padding:40px 40px 32px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:10px 16px;margin-bottom:16px;">
              <span style="font-size:28px;">🏠</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">BedWale.in</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">Find a PG that feels like home</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">

            <!-- Greeting -->
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
              Welcome, ${fullName}! 🎉
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              Your account has been created successfully. You're all set to start exploring PGs near you.
            </p>

            <!-- Registration info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:28px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Account Details</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:3px 0;font-size:14px;color:#374151;white-space:nowrap;padding-right:12px;">👤 Name:</td>
                      <td style="padding:3px 0;font-size:14px;color:#111827;font-weight:600;">${fullName}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0;font-size:14px;color:#374151;white-space:nowrap;padding-right:12px;">📧 Email:</td>
                      <td style="padding:3px 0;font-size:14px;color:#111827;font-weight:600;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0;font-size:14px;color:#374151;white-space:nowrap;padding-right:12px;">📅 Joined:</td>
                      <td style="padding:3px 0;font-size:14px;color:#111827;font-weight:600;">${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- What you can do -->
            <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;">What can you do now?</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ["🔍", "Search PGs", "Filter by city, area, price range and amenities."],
                ["📸", "View Photos", "Browse real photos before you visit in person."],
                ["📍", "See Location", "Check exact map location and distance from you."],
                ["⚡", "Book Instantly", "Send a booking request and get approved fast."],
              ].map(([icon, title, desc]) => `
              <tr>
                <td style="padding:0 0 14px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:40px;vertical-align:top;padding-top:2px;">
                        <div style="width:36px;height:36px;background:#f0fdf4;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">${icon}</div>
                      </td>
                      <td style="padding-left:12px;vertical-align:top;">
                        <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${title}</p>
                        <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${desc}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`).join("")}
            </table>

            <!-- CTA button -->
            <div style="text-align:center;margin:28px 0 8px;">
              <a href="${process.env.FRONTEND_URL || "https://www.bedwale.in"}/user/dashboard"
                 style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#16a34a,#059669);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                Start Exploring PGs →
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">
              This is an automated message from BedWale.in. Please do not reply.
            </p>
            <p style="margin:0;font-size:13px;color:#9ca3af;">
              Need help? Contact us at
              <a href="mailto:support@bedwale.in" style="color:#16a34a;text-decoration:none;">support@bedwale.in</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });
  } catch (error) {
    console.error("Error sending user welcome email:", error);
    throw new Error("Failed to send user welcome email");
  }
};

// Function to send verification email (optional enhancement)
// Function to send booking notification email to admin
export const sendBookingNotificationEmail = async (
  adminEmail,
  pgName,
  userName,
  bookingDetails,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      cc: adminEmail === SUPER_ADMIN_EMAIL ? undefined : SUPER_ADMIN_EMAIL,
      subject: `New Booking Request - ${pgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Booking Request</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .alert { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .btn { display: inline-block; padding: 12px 30px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
                .highlight { background-color: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #ffc107;">🏠 New Booking Request!</h1>
                </div>
                
                <div class="alert">
                    <strong>You have received a new booking request for your PG.</strong>
                </div>
                
                <div class="details">
                    <h3>Booking Details:</h3>
                    <p><strong>PG Name:</strong> ${pgName}</p>
                    <p><strong>Tenant:</strong> ${userName}</p>
                    ${bookingDetails.roomName ? `<div class="highlight">🛏️ Room: ${bookingDetails.roomName} | Bed #${bookingDetails.bedNumber}</div>` : ""}
                    <p><strong>Join Date:</strong> ${new Date(bookingDetails.joinDate).toLocaleDateString()}</p>
                    <p><strong>Stay Duration:</strong> ${bookingDetails.stayDays} days</p>
                    <p><strong>Total Amount:</strong> ₹${bookingDetails.totalPrice.toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${bookingDetails.paymentMethod}</p>
                    ${bookingDetails.notes ? `<p><strong>Notes:</strong> ${bookingDetails.notes}</p>` : ""}
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || "https://www.bedwale.in"}/admin/requests" class="btn">View & Manage Request</a>
                </div>
                
                <p>Please log in to your admin dashboard to approve or reject this booking request.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The BEDWALE.IN Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Booking notification email sent to admin:", adminEmail);
  } catch (error) {
    console.error("Error sending booking notification email:", error);
  }
};

// Function to send booking confirmation email to user
export const sendBookingConfirmationToUser = async (
  userEmail,
  userName,
  bookingDetails,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: `Booking Request Submitted - ${bookingDetails.pgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Request Submitted</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .success { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .highlight { background-color: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0; font-weight: bold; }
                .info-box { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #28a745;">✅ Booking Request Submitted!</h1>
                </div>
                
                <div class="success">
                    <strong>Hello ${userName}!</strong><br>
                    Your booking request has been submitted successfully. The PG admin will review your request and respond soon.
                </div>
                
                <div class="details">
                    <h3>Booking Summary:</h3>
                    <p><strong>PG Name:</strong> ${bookingDetails.pgName}</p>
                    <div class="highlight">🛏️ Room: ${bookingDetails.roomName} | Bed #${bookingDetails.bedNumber}</div>
                    <p><strong>Join Date:</strong> ${new Date(bookingDetails.joinDate).toLocaleDateString()}</p>
                    <p><strong>Stay Duration:</strong> ${bookingDetails.stayDays} days</p>
                    <p><strong>Total Amount:</strong> ₹${bookingDetails.totalPrice.toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${bookingDetails.paymentMethod}</p>
                </div>
                
                <div class="info-box">
                    <h4>📞 Contact PG Admin:</h4>
                    <p><strong>Name:</strong> ${bookingDetails.adminName}</p>
                    <p><strong>Phone:</strong> ${bookingDetails.adminPhone}</p>
                    <p><em>You can call the admin directly to discuss your booking and speed up the approval process.</em></p>
                </div>
                
                <p>You can view your booking status anytime by logging into your account and visiting the "My Requests" page.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The BEDWALE.IN Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Booking confirmation email sent to user:", userEmail);
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
  }
};

// Function to send booking cancellation notification email to admin
export const sendBookingCancellationEmail = async (
  adminEmail,
  pgName,
  userName,
  bookingDetails,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `Booking Cancelled - ${pgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Cancelled</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .alert { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #dc3545;">❌ Booking Cancelled</h1>
                </div>
                
                <div class="alert">
                    <strong>A booking request has been cancelled by the tenant.</strong>
                </div>
                
                <div class="details">
                    <h3>Cancelled Booking Details:</h3>
                    <p><strong>PG Name:</strong> ${pgName}</p>
                    <p><strong>Tenant:</strong> ${userName}</p>
                    <p><strong>Join Date:</strong> ${new Date(bookingDetails.joinDate).toLocaleDateString()}</p>
                    <p><strong>Stay Duration:</strong> ${bookingDetails.stayDays} days</p>
                    <p><strong>Total Amount:</strong> ₹${bookingDetails.totalPrice.toLocaleString()}</p>
                </div>
                
                <p>The room/bed is now available again. You may want to update your availability.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The BEDWALE.IN Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Booking cancellation email sent to admin:", adminEmail);
  } catch (error) {
    console.error("Error sending booking cancellation email:", error);
  }
};

// Function to send booking approval email to user
export const sendBookingApprovalEmail = async (
  userEmail,
  userName,
  bookingDetails,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: `🎉 Booking Approved - ${bookingDetails.pgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Approved</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .success { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .highlight { background-color: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0; font-weight: bold; }
                .info-box { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
                .btn { display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #28a745;">🎉 Booking Approved!</h1>
                </div>
                
                <div class="success">
                    <strong>Congratulations ${userName}!</strong><br>
                    Your booking request has been approved by the PG admin. Your room is now reserved!
                </div>
                
                <div class="details">
                    <h3>Booking Details:</h3>
                    <p><strong>PG Name:</strong> ${bookingDetails.pgName}</p>
                    <div class="highlight">🛏️ Room: ${bookingDetails.roomName} | Bed #${bookingDetails.bedNumber}</div>
                    <p><strong>Join Date:</strong> ${new Date(bookingDetails.joinDate).toLocaleDateString()}</p>
                    <p><strong>Stay Duration:</strong> ${bookingDetails.stayDays} days</p>
                    <p><strong>Total Amount:</strong> ₹${bookingDetails.totalPrice.toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${bookingDetails.paymentMethod}</p>
                </div>
                
                <div class="info-box">
                    <h4>📞 PG Admin Contact:</h4>
                    <p><strong>Name:</strong> ${bookingDetails.adminName}</p>
                    <p><strong>Phone:</strong> ${bookingDetails.adminPhone}</p>
                    <p><em>You can contact the admin for any questions about your stay.</em></p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || "https://www.bedwale.in"}/user/requests" class="btn">View My Bookings</a>
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>Save the admin's contact information</li>
                    <li>Arrive on your join date as scheduled</li>
                    <li>Bring necessary documents for verification</li>
                </ul>
                
                <div class="footer">
                    <p>Best regards,<br>The BEDWALE.IN Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Booking approval email sent to user:", userEmail);
  } catch (error) {
    console.error("Error sending booking approval email:", error);
  }
};

// Function to send booking rejection email to user
export const sendBookingRejectionEmail = async (
  userEmail,
  userName,
  bookingDetails,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: `Booking Request Update - ${bookingDetails.pgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Request Update</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .alert { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .info-box { background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
                .btn { display: inline-block; padding: 12px 30px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #dc3545;">Booking Request Update</h1>
                </div>
                
                <div class="alert">
                    <strong>Hello ${userName},</strong><br>
                    Unfortunately, your booking request has been rejected by the PG admin.
                </div>
                
                <div class="details">
                    <h3>Rejected Booking Details:</h3>
                    <p><strong>PG Name:</strong> ${bookingDetails.pgName}</p>
                    <p><strong>Room:</strong> ${bookingDetails.roomName} | Bed #${bookingDetails.bedNumber}</p>
                    <p><strong>Join Date:</strong> ${new Date(bookingDetails.joinDate).toLocaleDateString()}</p>
                    <p><strong>Stay Duration:</strong> ${bookingDetails.stayDays} days</p>
                    <p><strong>Total Amount:</strong> ₹${bookingDetails.totalPrice.toLocaleString()}</p>
                </div>
                
                <div class="info-box">
                    <h4>💡 What's Next?</h4>
                    <p>Don't worry! You can:</p>
                    <ul>
                        <li>Browse other available PGs on our platform</li>
                        <li>Contact the admin directly to understand the reason</li>
                        <li>Submit a new booking request for a different room/bed</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || "https://www.bedwale.in"}/user/dashboard" class="btn">Browse Available PGs</a>
                </div>
                
                <p>If you have any questions or need assistance finding alternative accommodation, please don't hesitate to contact our support team.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The BEDWALE.IN Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Booking rejection email sent to user:", userEmail);
  } catch (error) {
    console.error("Error sending booking rejection email:", error);
  }
};

export const sendVerificationEmail = async (email, name, verificationLink) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Verify Your Email Address - BEDWALE.IN",
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
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #27ae60;">Please Verify Your Email</h1>
                </div>
                
                <p>Hello ${name},</p>
                
                <p>Thank you for registering with BEDWALE.IN! To complete your registration, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center;">
                    <a href="${verificationLink}" class="btn">Verify Email Address</a>
                </div>
                
                <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${verificationLink}</p>
                
                <p>This verification link will expire in 24 hours for security reasons.</p>
                
                <p>If you didn't register for BEDWALE.IN, please ignore this email.</p>
                
                <p>Best regards,<br>
                The BEDWALE.IN Team</p>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Verification email sent successfully to:", email);
    return result;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Chat message notification — sent to the RECIPIENT when they are offline.
// recipientType: "user" | "admin"
// ─────────────────────────────────────────────────────────────────────────────
export const sendChatNotificationEmail = async ({
  recipientEmail,
  recipientName,
  recipientType,   // "user" | "admin"
  senderName,
  pgName,
  messagePreview,
  bookingId,
}) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const FRONTEND = process.env.FRONTEND_URL || "https://www.bedwale.in";

    // Deep-link straight into the chat for that booking
    const chatUrl = recipientType === "admin"
      ? `${FRONTEND}/admin/chat?bookingId=${bookingId}`
      : `${FRONTEND}/user/chat?bookingId=${bookingId}`;

    // Truncate preview so the email is not too long
    const preview = messagePreview.length > 120
      ? messagePreview.slice(0, 120) + "…"
      : messagePreview;

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject: `💬 New message from ${senderName} — ${pgName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>New Message — BedWale.in</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#94007b 0%,#b5009a 100%);padding:32px 40px 28px;text-align:center;">
            <p style="margin:0 0 8px;font-size:28px;">💬</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">
              New Message
            </h1>
            <p style="margin:6px 0 0;color:#f5d0ee;font-size:13px;">BedWale.in — Messaging</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 24px;">

            <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">
              Hi ${recipientName}!
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
              You have a new message from <strong style="color:#111827;">${senderName}</strong>
              regarding your booking at <strong style="color:#111827;">${pgName}</strong>.
            </p>

            <!-- Message preview bubble -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.6px;">
                    Message preview
                  </p>
                  <p style="margin:0;font-size:15px;color:#1f2937;line-height:1.7;font-style:italic;">
                    "${preview}"
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA button -->
            <div style="text-align:center;margin-bottom:8px;">
              <a href="${chatUrl}"
                style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#94007b,#b5009a);color:#ffffff;text-decoration:none;border-radius:9px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                Reply Now →
              </a>
            </div>
            <p style="text-align:center;margin:10px 0 0;font-size:12px;color:#9ca3af;">
              Or copy this link: <a href="${chatUrl}" style="color:#94007b;">${chatUrl}</a>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
              This is an automated notification from BedWale.in. Do not reply to this email.
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Need help?
              <a href="mailto:support@bedwale.in" style="color:#94007b;text-decoration:none;">support@bedwale.in</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });

    console.log(`Chat notification email sent to ${recipientType}: ${recipientEmail}`);
  } catch (error) {
    // Non-fatal — log and move on, never block the message send
    console.error("Error sending chat notification email:", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Email Verification OTP — sent during registration so the user/admin can
// verify their email address
// ─────────────────────────────────────────────────────────────────────────────
export const sendEmailVerificationOtp = async (email, name, otp) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `${otp} is your BedWale.in verification code`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Email Verification — BedWale.in</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#94007b 0%,#b5009a 100%);padding:32px 40px 28px;text-align:center;">
            <p style="margin:0 0 6px;font-size:30px;">✉️</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">
              Verify your email
            </h1>
            <p style="margin:6px 0 0;color:#f5d0ee;font-size:13px;">BedWale.in — Account Security</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi ${name}! 👋</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.65;">
              Thanks for signing up to BedWale.in. Use the code below to verify your email address.
              This code is valid for <strong style="color:#111827;">10 minutes</strong>.
            </p>

            <!-- OTP box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <div style="display:inline-block;background:#fdf4ff;border:2px dashed #94007b;border-radius:14px;padding:20px 40px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94007b;letter-spacing:.12em;text-transform:uppercase;">
                      Your verification code
                    </p>
                    <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:10px;color:#94007b;line-height:1.1;font-family:'Courier New',monospace;">
                      ${otp}
                    </p>
                  </div>
                </td>
              </tr>
            </table>

            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                ⚠️ <strong>Never share this code</strong> with anyone.
                BedWale.in staff will never ask for your OTP.
              </p>
            </div>

            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              If you did not create an account on BedWale.in, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} BedWale.in · All rights reserved
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log("Email verification OTP sent to:", email);
  } catch (error) {
    console.error("Error sending email verification OTP:", error);
    throw new Error("Failed to send verification email");
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Password Reset OTP — sent when user/admin requests a password reset
// ─────────────────────────────────────────────────────────────────────────────
export const sendPasswordResetOtpEmail = async (email, name, otp) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `${otp} — your BedWale.in password reset code`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset Your Password — BedWale.in</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#94007b 0%,#b5009a 100%);padding:32px 40px 28px;text-align:center;">
            <p style="margin:0 0 6px;font-size:30px;">🔐</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">
              Reset your password
            </h1>
            <p style="margin:6px 0 0;color:#f5d0ee;font-size:13px;">BedWale.in — Account Security</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi ${name}! 👋</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.65;">
              We received a request to reset your BedWale.in password.
              Use the code below to reset it. This code is valid for
              <strong style="color:#111827;">10 minutes</strong>.
            </p>

            <!-- OTP box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <div style="display:inline-block;background:#fdf4ff;border:2px dashed #94007b;border-radius:14px;padding:20px 40px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94007b;letter-spacing:.12em;text-transform:uppercase;">
                      Password reset code
                    </p>
                    <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:10px;color:#94007b;line-height:1.1;font-family:'Courier New',monospace;">
                      ${otp}
                    </p>
                  </div>
                </td>
              </tr>
            </table>

            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#991b1b;">
                🚫 <strong>Did not request this?</strong> Ignore this email — your password will remain unchanged.
                Someone may have entered your email by mistake.
              </p>
            </div>

            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                ⚠️ <strong>Never share this code</strong> with anyone.
                BedWale.in staff will never ask for your reset code.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} BedWale.in · All rights reserved
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log("Password reset OTP sent to:", email);
  } catch (error) {
    console.error("Error sending password reset OTP:", error);
    throw new Error("Failed to send password reset email");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Booking Rescheduled — sent to user (confirmation) + admin (alert)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sent to the USER after they reschedule a pending booking.
 * bookingDetails: { pgName, roomName, bedNumber, oldJoinDate, newJoinDate, stayDays, totalPrice, paymentMethod }
 */
export const sendBookingRescheduledToUser = async (
  userEmail,
  userName,
  bookingDetails,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: `Booking Rescheduled — ${bookingDetails.pgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Rescheduled</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .info { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .highlight { background-color: #e8f5e9; padding: 10px; border-radius: 4px; margin: 10px 0; font-weight: bold; }
                .old-date { color: #999; text-decoration: line-through; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #2196f3;">📅 Booking Rescheduled</h1>
                </div>
                <div class="info">
                    <strong>Hello ${userName}!</strong><br>
                    Your booking has been rescheduled successfully. The PG admin has been notified and will review the updated request.
                </div>
                <div class="details">
                    <h3>Updated Booking Details:</h3>
                    <p><strong>PG Name:</strong> ${bookingDetails.pgName}</p>
                    <div class="highlight">🛏️ Room: ${bookingDetails.roomName} | Bed #${bookingDetails.bedNumber}</div>
                    <p><strong>Previous Join Date:</strong> <span class="old-date">${new Date(bookingDetails.oldJoinDate).toLocaleDateString()}</span></p>
                    <p><strong>New Join Date:</strong> ${new Date(bookingDetails.newJoinDate).toLocaleDateString()}</p>
                    <p><strong>Stay Duration:</strong> ${bookingDetails.stayDays} days</p>
                    <p><strong>Total Amount:</strong> ₹${bookingDetails.totalPrice.toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${bookingDetails.paymentMethod}</p>
                </div>
                <p>Your booking is still <strong>pending</strong>. The admin will approve or reject it shortly.</p>
                <div class="footer">
                    <p>Best regards,<br>The BEDWALE.IN Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Booking rescheduled confirmation sent to user:", userEmail);
  } catch (error) {
    console.error("Error sending booking rescheduled email to user:", error);
  }
};

/**
 * Sent to the ADMIN when a tenant reschedules a pending booking.
 * bookingDetails: { pgName, roomName, bedNumber, oldJoinDate, newJoinDate, stayDays, totalPrice, paymentMethod }
 */
export const sendBookingRescheduledToAdmin = async (
  adminEmail,
  pgName,
  userName,
  bookingDetails,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `Booking Rescheduled by Tenant — ${pgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Rescheduled</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .info { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .highlight { background-color: #e8f5e9; padding: 10px; border-radius: 4px; margin: 10px 0; font-weight: bold; }
                .old-date { color: #999; text-decoration: line-through; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #2196f3;">📅 Tenant Rescheduled a Booking</h1>
                </div>
                <div class="info">
                    <strong>${userName}</strong> has rescheduled their booking for <strong>${pgName}</strong>. Please review and approve or reject the updated request.
                </div>
                <div class="details">
                    <h3>Updated Booking Details:</h3>
                    <p><strong>PG Name:</strong> ${bookingDetails.pgName}</p>
                    <p><strong>Tenant:</strong> ${userName}</p>
                    <div class="highlight">🛏️ Room: ${bookingDetails.roomName} | Bed #${bookingDetails.bedNumber}</div>
                    <p><strong>Previous Join Date:</strong> <span class="old-date">${new Date(bookingDetails.oldJoinDate).toLocaleDateString()}</span></p>
                    <p><strong>New Join Date:</strong> ${new Date(bookingDetails.newJoinDate).toLocaleDateString()}</p>
                    <p><strong>Stay Duration:</strong> ${bookingDetails.stayDays} days</p>
                    <p><strong>Total Amount:</strong> ₹${bookingDetails.totalPrice.toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${bookingDetails.paymentMethod}</p>
                </div>
                <p>Log in to your admin panel to approve or reject this booking.</p>
                <div class="footer">
                    <p>Best regards,<br>The BEDWALE.IN Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Booking rescheduled alert sent to admin:", adminEmail);
  } catch (error) {
    console.error("Error sending booking rescheduled email to admin:", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Booking Cancellation Confirmation — sent to USER when they cancel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sent to the USER to confirm their own cancellation.
 * bookingDetails: { pgName, joinDate, stayDays, totalPrice }
 */
export const sendBookingCancellationConfirmationToUser = async (
  userEmail,
  userName,
  bookingDetails,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: `Booking Cancelled — ${bookingDetails.pgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Cancelled</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .alert { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">BEDWALE.IN</div>
                    <h1 style="color: #dc3545;">❌ Booking Cancelled</h1>
                </div>
                <div class="alert">
                    <strong>Hello ${userName},</strong><br>
                    Your booking request has been cancelled successfully.
                </div>
                <div class="details">
                    <h3>Cancelled Booking Details:</h3>
                    <p><strong>PG Name:</strong> ${bookingDetails.pgName}</p>
                    <p><strong>Join Date:</strong> ${new Date(bookingDetails.joinDate).toLocaleDateString()}</p>
                    <p><strong>Stay Duration:</strong> ${bookingDetails.stayDays} days</p>
                    <p><strong>Total Amount:</strong> ₹${bookingDetails.totalPrice.toLocaleString()}</p>
                </div>
                <p>If you'd like to book again, visit <a href="https://bedwale.in">bedwale.in</a> and search for available PGs.</p>
                <div class="footer">
                    <p>Best regards,<br>The BEDWALE.IN Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    console.log("Booking cancellation confirmation sent to user:", userEmail);
  } catch (error) {
    console.error("Error sending cancellation confirmation to user:", error);
  }
};

/**
 * Sent to SUPER-ADMIN when a new contact form message arrives.
 * Also sends an auto-reply acknowledgement to the person who contacted us.
 *
 * @param {string} senderName   - Name from the contact form
 * @param {string} senderEmail  - Email from the contact form
 * @param {string} messageText  - Message body from the contact form
 */
export const sendContactNotificationEmail = async (
  senderName,
  senderEmail,
  messageText,
) => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "jayeshsevatkar55@gmail.com";
  const receivedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  /* ── 1. Notify the super-admin ── */
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      reply_to: senderEmail,
      subject: `📩 New Contact Message from ${senderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Message</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #94007b; letter-spacing: -0.5px; }
            .badge { display: inline-block; background: #94007b; color: #fff; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }
            .meta { background-color: #f8f9fa; border-left: 4px solid #94007b; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
            .meta p { margin: 4px 0; font-size: 14px; }
            .message-box { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px 20px; margin: 20px 0; font-size: 15px; white-space: pre-wrap; word-break: break-word; }
            .reply-note { font-size: 13px; color: #666; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px 16px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BEDWALE.IN</div>
              <div class="badge">New Contact Message</div>
            </div>
            <p>You have received a new message through the contact form on <strong>bedwale.in</strong>.</p>
            <div class="meta">
              <p><strong>From:</strong> ${senderName}</p>
              <p><strong>Email:</strong> <a href="mailto:${senderEmail}">${senderEmail}</a></p>
              <p><strong>Received:</strong> ${receivedAt} (IST)</p>
            </div>
            <p><strong>Message:</strong></p>
            <div class="message-box">${messageText}</div>
            <div class="reply-note">
              💡 To reply, simply hit <strong>Reply</strong> in your email client — it will go directly to <strong>${senderEmail}</strong>.
            </div>
            <div class="footer">
              <p>BEDWALE.IN · Automated notification</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log("Contact notification sent to admin:", adminEmail);
  } catch (err) {
    console.error("Error sending contact notification to admin:", err);
  }

  /* ── 2. Auto-reply to the sender ── */
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: senderEmail,
      subject: "We received your message — Bedwale.in",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>We got your message</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #94007b; }
            .highlight { background: #fdf4ff; border-left: 4px solid #94007b; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
            .message-box { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px 20px; font-size: 14px; color: #555; white-space: pre-wrap; word-break: break-word; margin: 16px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BEDWALE.IN</div>
              <h2 style="color: #1f2328; margin-top: 8px;">Thanks for reaching out, ${senderName}!</h2>
            </div>
            <div class="highlight">
              We've received your message and our team will get back to you within <strong>24 hours</strong>.
            </div>
            <p>Here's a copy of what you sent us:</p>
            <div class="message-box">${messageText}</div>
            <p>In the meantime, you can also reach us at:</p>
            <p>📧 <a href="mailto:jayeshsevatkar55@gmail.com">jayeshsevatkar55@gmail.com</a><br>
               📞 +91 8888585093<br>
               🕐 Mon–Sun, 9 am – 9 pm IST</p>
            <div class="footer">
              <p>Best regards,<br><strong>The BEDWALE.IN Team</strong></p>
              <p style="margin-top: 8px; font-size: 12px;">You're receiving this because you submitted a contact form at bedwale.in.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log("Contact auto-reply sent to:", senderEmail);
  } catch (err) {
    console.error("Error sending contact auto-reply:", err);
  }
};

export const sendReviewInviteEmail = async (
  userEmail,
  userName,
  pgName,
  reviewUrl,
) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: `Share Your Experience at ${pgName} — BEDWALE.IN`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Leave a Review</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #94007b; letter-spacing: -0.5px; }
            .stars { font-size: 32px; text-align: center; margin: 16px 0; }
            .highlight { background: #fdf4ff; border-left: 4px solid #94007b; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
            .btn { display: inline-block; padding: 14px 36px; background-color: #94007b; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 24px 0; }
            .pg-name { font-size: 18px; font-weight: 700; color: #1f2328; }
            .note { font-size: 12px; color: #888; margin-top: 16px; word-break: break-all; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BEDWALE.IN</div>
            </div>

            <p>Hi <strong>${userName}</strong>,</p>
            <p>Thank you for staying at <span class="pg-name">${pgName}</span>! We hope you had a wonderful experience.</p>

            <div class="highlight">
              Your feedback helps other tenants make better decisions — and takes less than a minute!
            </div>

            <div class="stars">⭐⭐⭐⭐⭐</div>

            <p style="text-align:center;">
              <a href="${reviewUrl}" class="btn">Write My Review</a>
            </p>

            <p>The review link is unique to you and can only be used once. It does not expire.</p>

            <div class="note">
              If the button above doesn't work, copy and paste this URL into your browser:<br>
              ${reviewUrl}
            </div>

            <div class="footer">
              <p>Best regards,<br><strong>The BEDWALE.IN Team</strong></p>
              <p style="margin-top:8px;font-size:12px;">You're receiving this email because you recently stayed at ${pgName} via bedwale.in.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Review invite email sent to:", userEmail);
  } catch (error) {
    console.error("Error sending review invite email:", error);
  }
};
