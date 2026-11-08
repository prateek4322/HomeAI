import jwt from "jsonwebtoken";
import { prisma } from "../config/database.js";

export const protect = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required. Please login." });
    }
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    if (!Number.isInteger(decoded.userId)) {
      return res.status(401).json({ message: "Invalid authentication token." });
    }
    req.userId = decoded.userId;
    return next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error.message);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

// Verify role from the database on every admin request.
export const adminOnly = async (req, res, next) => {
  try {
    if (!Number.isInteger(req.userId)) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, role: true },
    });
    if (!user) return res.status(401).json({ message: "Account not found." });
    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required." });
    }
    req.userRole = user.role;
    return next();
  } catch (error) {
    console.error("ADMIN AUTHORIZATION ERROR:", error);
    return res.status(500).json({ message: "Unable to verify admin access." });
  }
};
