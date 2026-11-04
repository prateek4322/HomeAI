import express from "express";
import { chatWithAI } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/chat", chatWithAI);

export default router;