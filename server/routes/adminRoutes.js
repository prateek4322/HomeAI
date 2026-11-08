import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getAdminDashboard, getAdminUsers, updateUserRole, deleteAdminUser, getAdminProducts,
} from "../controllers/adminController.js";

const router = express.Router();
router.use(protect, adminOnly);
router.get("/dashboard", getAdminDashboard);
router.get("/users", getAdminUsers);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteAdminUser);
router.get("/products", getAdminProducts);
export default router;
