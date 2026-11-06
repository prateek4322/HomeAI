import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import { protect } from "./middleware/authMiddleware.js";
import { prisma } from "./config/database.js";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(morgan("dev"));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "HomeAI API is running",
  });
});

// Authentication
app.use("/api/auth", authRoutes);

// Products
app.use("/api/products", productRoutes);

// AI Assistant
app.use("/api/ai", aiRoutes);

// Dashboard Summary
app.get("/api/dashboard/summary", protect, async (req, res) => {
  try {
    const userId = req.userId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const products = await prisma.product.findMany({
      where: { userId },
      select: {
        id: true,
        expiryDate: true,
        daysLeft: true,
        category: true,
      },
    });

    let expiringSoon = 0;
    let expiredItems = 0;
    let safeItems = 0;

    products.forEach((product) => {
      let daysLeft = product.daysLeft;

      if (product.expiryDate) {
        const expiry = new Date(product.expiryDate);
        expiry.setHours(0, 0, 0, 0);

        daysLeft = Math.ceil(
          (expiry.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
        );
      }

      if (daysLeft < 0) {
        expiredItems++;
      } else if (daysLeft <= 7) {
        expiringSoon++;
      } else {
        safeItems++;
      }
    });

    const categories = [
      ...new Set(products.map((product) => product.category)),
    ];

    return res.status(200).json({
      totalItems: products.length,
      expiringSoon,
      expiredItems,
      safeItems,
      categories: categories.length,
    });

  } catch (error) {
    console.error("DASHBOARD ERROR:", error);

    return res.status(500).json({
      message: "Dashboard data failed",
    });
  }
});

// Express error handler
app.use((error, req, res, next) => {
  console.error("HOMEAI SERVER ERROR:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: "Internal server error",
  });
});

export default app;