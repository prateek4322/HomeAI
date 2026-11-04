import { prisma } from "../config/database.js";
import { lookupProductByBarcode } from "../services/productLookupService.js";

export const lookupProduct = async (req, res) => {
  try {
    const barcode = String(req.body.barcode || "").trim();

    // Validate barcode
    if (!/^\d{8,14}$/.test(barcode)) {
      return res.status(400).json({
        found: false,
        message: "Please provide a valid 8-14 digit barcode.",
      });
    }

    // Check current user's inventory first
    const existingProduct = await prisma.product.findFirst({
      where: {
        barcode,
        userId: req.userId,
      },
    });

    if (existingProduct) {
      return res.status(200).json({
        found: true,
        product: {
          barcode: existingProduct.barcode,
          name: existingProduct.name,
          brand: existingProduct.brand || "",
          quantity: existingProduct.quantity || "",
          category: existingProduct.category || "Food",
          emoji: existingProduct.emoji || "📦",
          imageUrl: existingProduct.imageUrl || "",
          description: existingProduct.description || "",
          source: "HomeAI Inventory",
        },
      });
    }

    // Search external product databases
    const result = await lookupProductByBarcode(barcode);

    // Include imageUrl in lookup response
    if (result.found && result.product) {
      return res.status(200).json({
        ...result,
        product: {
          ...result.product,
          imageUrl:
            result.product.imageUrl ||
            result.product.image ||
            "",
        },
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("BARCODE LOOKUP ERROR:", error);

    return res.status(500).json({
      found: false,
      message: "Product lookup failed. Please try again.",
    });
  }
};