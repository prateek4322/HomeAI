import { GoogleGenAI } from "@google/genai";
import { prisma } from "../config/database.js";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Please enter a message.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: "Gemini API key is not configured.",
      });
    }

    // Fetch logged-in user's inventory
    // Database Performance Tracking
const dbStartTime = Date.now();

// Get logged-in user's inventory
const products = await prisma.product.findMany({
  where: {
    userId: req.userId,
  },
  select: {
    name: true,
    brand: true,
    quantity: true,
    category: true,
    location: true,
    expiryDate: true,
    daysLeft: true,
  },
});

console.log(`Database Time: ${Date.now() - dbStartTime}ms`);

    // Prepare inventory context
    const inventoryContext = products.length
      ? products.map((product) => ({
          name: product.name,
          brand: product.brand,
          quantity: product.quantity,
          category: product.category,
          location: product.location,
          expiryDate: product.expiryDate,
          daysLeft: product.daysLeft,
        }))
      : "No products found in inventory.";

    const prompt = `
You are HomeAI, a smart and helpful home inventory assistant.

Your responsibilities:
1. Help users manage their household inventory.
2. Answer questions using their actual inventory.
3. Identify products that are expiring soon.
4. Suggest recipes using available food items.
5. Suggest shopping lists when needed.
6. Give practical household management advice.

Important rules:
- Use the provided inventory data.
- Never invent products or quantities.
- If information is unavailable, clearly say so.
- Keep answers clear, helpful and concise.
- Prioritize products that are expiring soon.

USER INVENTORY:
${JSON.stringify(inventoryContext, null, 2)}

USER QUESTION:
${message}
`;

    // Generate Gemini response
    const aiStartTime = Date.now();

const result = await genAI.models.generateContent({
  model: "gemini-3.5-flash-lite",
  contents: prompt,
  config: {
    temperature: 0.5,
    maxOutputTokens: 512,
  },
});

console.log(
  `Gemini Response Time: ${Date.now() - aiStartTime}ms`
);

const reply = result.text;

    return res.status(200).json({
      success: true,
      reply,
    });

  } catch (error) {
    console.error("HOME AI ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "AI assistant failed. Please try again.",
    });
  }
};