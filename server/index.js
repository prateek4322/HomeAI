import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { protect } from "./middleware/authMiddleware.js";
import { connectDatabase, prisma } from "./config/database.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { verifyEmailConnection } from "./services/emailService.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(morgan("dev"));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "HomeAI API is running"
  });
});

// Authentication Routes
app.use("/api/auth", authRoutes);

// Product Routes
app.use("/api/products", productRoutes);
// AI Assistant Routes
app.use("/api/ai", aiRoutes);

// Dashboard Summary
app.get("/api/dashboard/summary", protect, async (req, res) => {
  try {
    const userId = req.userId;

    // Start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // Fetch user's products
    const products = await prisma.product.findMany({
      where: { userId },
      select: {
        id: true,
        expiryDate: true,
        daysLeft: true,
        category: true,
      },
    });

    const totalItems = products.length;

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

    // Count unique categories
    const categories = [
      ...new Set(products.map((product) => product.category)),
    ];

    res.status(200).json({
      totalItems,
      expiringSoon,
      expiredItems,
      safeItems,
      categories: categories.length,
    });

  } catch (error) {
    console.error("DASHBOARD ERROR:", error);

    res.status(500).json({
      message: "Dashboard data failed",
    });
  }
});
// Start Server
const startServer = async () => {
  try {
    await connectDatabase();

    // Verify Gmail SMTP
    await verifyEmailConnection();

    app.listen(PORT, () => {
      console.log(`HomeAI Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();