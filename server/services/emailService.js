import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Check Resend configuration
export const verifyEmailConnection = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is missing");
    return false;
  }

  console.log("Resend Email API configured successfully");
  return true;
};

// Send Password Reset Email
export const sendPasswordResetEmail = async (email, resetURL) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "HomeAI Support <onboarding@resend.dev>",

    to: [email],

    subject: "Reset Your HomeAI Password",

    html: `
      <div style="font-family:Arial,sans-serif;max-width:550px;margin:auto;padding:30px;background:#0b1913;color:#fff;border-radius:14px;">

        <h1 style="color:#00d6a0;">HomeAI</h1>

        <h2>Reset Your Password</h2>

        <p style="color:#b5c8bd;line-height:1.7;">
          We received a request to reset your HomeAI account password.
          Click below to create a new password.
        </p>

        <a href="${resetURL}"
          style="display:inline-block;padding:14px 25px;background:#00d6a0;color:#032016;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0;">
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
  });

  if (error) {
    console.error("Resend Email Error:", error);
    throw new Error(error.message);
  }

  console.log("Password Reset Email Sent:", data.id);

  return data;
};