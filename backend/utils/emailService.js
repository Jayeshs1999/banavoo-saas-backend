import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

// Shared Resend sender address
const FROM_ADDRESS = "STHALS <noreply@sthals.in>";

// Super-admin always receives a CC on every new booking notification
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "jayeshsevatkar55@gmail.com";

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
              <a href="${process.env.FRONTEND_URL || "https://www.sthals.in"}/user/dashboard"
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
              <a href="mailto:support@sthals.in" style="color:#16a34a;text-decoration:none;">support@sthals.in</a>
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
                    <div class="logo">STHALS.IN</div>
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
                    <a href="${process.env.FRONTEND_URL || "https://www.sthals.in"}/admin/requests" class="btn">View & Manage Request</a>
                </div>
                
                <p>Please log in to your admin dashboard to approve or reject this booking request.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The STHALS.IN Team</p>
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
                    <div class="logo">STHALS.IN</div>
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
                    <p>Best regards,<br>The STHALS.IN Team</p>
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
                    <div class="logo">STHALS.IN</div>
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
                    <p>Best regards,<br>The STHALS.IN Team</p>
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
                    <div class="logo">STHALS.IN</div>
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
                    <a href="${process.env.FRONTEND_URL || "https://www.sthals.in"}/user/requests" class="btn">View My Bookings</a>
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>Save the admin's contact information</li>
                    <li>Arrive on your join date as scheduled</li>
                    <li>Bring necessary documents for verification</li>
                </ul>
                
                <div class="footer">
                    <p>Best regards,<br>The STHALS.IN Team</p>
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
                    <div class="logo">STHALS.IN</div>
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
                    <a href="${process.env.FRONTEND_URL || "https://www.sthals.in"}/user/dashboard" class="btn">Browse Available PGs</a>
                </div>
                
                <p>If you have any questions or need assistance finding alternative accommodation, please don't hesitate to contact our support team.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The STHALS.IN Team</p>
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
    const FRONTEND = process.env.FRONTEND_URL || "https://www.sthals.in";

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
              <a href="mailto:support@sthals.in" style="color:#94007b;text-decoration:none;">support@sthals.in</a>
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
