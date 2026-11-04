import { prisma } from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

import { sendPasswordResetEmail } from "../services/emailService.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// USER SIGNUP
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        message: "Name must contain at least 2 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const token = generateToken(user.id);

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user,
    });

  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    return res.status(500).json({
      message: "Signup failed",
    });
  }
};

// USER LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};

// GOOGLE LOGIN / SIGNUP
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        message: "Google authentication is not configured",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Google account verification failed",
      });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split("@")[0];

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");

      const passwordHash = await bcrypt.hash(
        randomPassword,
        12
      );

      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
      });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      message: "Google authentication successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("GOOGLE AUTH ERROR:", error);

    return res.status(401).json({
      message: "Google authentication failed. Please try again.",
    });
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Please enter your email address",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Same response whether account exists or not
    const successMessage =
      "If an account exists with this email, a password reset link has been sent.";

    if (!user) {
      return res.status(200).json({
        message: successMessage,
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only hashed token in database
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires after 15 minutes
    const expiryTime = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expiryTime,
      },
    });

    const resetURL =
  `${process.env.CLIENT_URL}/?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(
        user.email,
        resetURL
      );
    } catch (emailError) {
      // Clear token if email sending fails
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      console.error("PASSWORD RESET EMAIL ERROR:", emailError);

      return res.status(500).json({
        message: "Unable to send reset email. Please try again later.",
      });
    }

    return res.status(200).json({
      message: successMessage,
    });

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Password reset request failed",
    });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const token = req.body.token || req.params.token;
const { password } = req.body;

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters",
      });
    }

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        message: "Invalid or expired reset link",
      });
    }

    // Hash received token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find matching user with unexpired token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or has expired",
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and invalidate token
    const result = await prisma.user.updateMany({
      where: {
        id: user.id,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    if (result.count === 0) {
      return res.status(400).json({
        message: "Reset link is invalid or has expired",
      });
    }

    return res.status(200).json({
      message: "Password reset successful. Please login with your new password.",
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Password reset failed",
    });
  }
};