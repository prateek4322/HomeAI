import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS?.replace(/\s/g, ""),
  },
});

// Verify SMTP connection
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("Gmail SMTP Connected Successfully");
    return true;
  } catch (error) {
    console.error("Gmail SMTP Connection Failed:", error.message);
    return false;
  }
};

// Send Password Reset Email
export const sendPasswordResetEmail = async (email, resetURL) => {
  const mailOptions = {
    from: `"HomeAI Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Your HomeAI Password",

    html: `
      <div style="font-family:Arial,sans-serif;max-width:550px;margin:auto;padding:30px;background:#0b1913;color:#fff;border-radius:14px;">
        <h1 style="color:#00d6a0;">HomeAI</h1>

        <h2>Reset Your Password</h2>

        <p style="color:#b5c8bd;line-height:1.7;">
          We received a request to reset your HomeAI account password.
          Click below to create a new password.
        </p>

        <a href="${resetURL}" style="display:inline-block;padding:14px 25px;background:#00d6a0;color:#032016;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0;">
          Reset Password
        </a>

        <p style="color:#b5c8bd;font-size:13px;">
          This link expires in 15 minutes.
        </p>

        <p style="color:#b5c8bd;font-size:13px;">
          If you did not request a password reset, ignore this email.
        </p>

        <hr style="border-color:#294638;">

        <p style="color:#71877b;font-size:12px;">
          © 2026 HomeAI. Smart Home, Zero Waste.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
