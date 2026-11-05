import { OAuth2Client } from "google-auth-library";

const oauth2Client = new OAuth2Client(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// Verify Gmail API configuration
export const verifyEmailConnection = async () => {
  try {
    const requiredVariables = [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "GMAIL_SENDER_EMAIL",
    ];

    const missing = requiredVariables.filter(
      (key) => !process.env[key]
    );

    if (missing.length) {
      throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }

    await oauth2Client.getAccessToken();

    console.log("Gmail API Connected Successfully");
    return true;
  } catch (error) {
    console.error("Gmail API Connection Failed:", error.message);
    return false;
  }
};

// Send Password Reset Email
export const sendPasswordResetEmail = async (email, resetURL) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    if (!accessToken.token) {
      throw new Error("Unable to generate Gmail access token");
    }

    const html = `
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
    `;

    const message = [
      `To: ${email}`,
      `From: HomeAI Support <${process.env.GMAIL_SENDER_EMAIL}>`,
      "Subject: Reset Your HomeAI Password",
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    ].join("\r\n");

    const rawMessage = Buffer.from(message).toString("base64url");

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: rawMessage,
        }),
      }
    );

    const result = await response.json();
    console.log("GMAIL API STATUS:", response.status);
console.log("GMAIL API RESPONSE:", JSON.stringify(result));

    if (!response.ok) {
      console.error("Gmail API Error:", result);
      throw new Error(
        result.error?.message || "Failed to send password reset email"
      );
    }

    console.log("Password Reset Email Sent:", result.id);

    return result;
  } catch (error) {
    console.error("Gmail Email Error:", error.message);
    throw error;
  }
};