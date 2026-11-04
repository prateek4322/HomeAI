import { prisma } from "../config/database.js";

// Calculate remaining days until expiry
const calculateDaysLeft = (expiryDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
};

// Normalize barcode
const normalizeBarcode = (barcode) => {
  if (barcode === undefined || barcode === null) {
    return null;
  }

  const value = String(barcode).trim();
  return value || null;
};

// Normalize optional image URL
const normalizeImageUrl = (imageUrl) => {
  if (imageUrl === undefined || imageUrl === null) {
    return null;
  }

  const value = String(imageUrl).trim();
  return value || null;
};

// Check Prisma duplicate constraint error
const isDuplicateBarcodeError = (error) => {
  return error.code === "P2002";
};

// GET USER PRODUCTS
export const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const updatedProducts = products.map((product) => ({
      ...product,
      daysLeft: product.expiryDate
        ? calculateDaysLeft(product.expiryDate)
        : product.daysLeft,
      imageUrl: product.imageUrl || "",
    }));

    return res.status(200).json(updatedProducts);
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

// ADD PRODUCT
export const addProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      qty,
      place,
      days,
      expiryDate,
      category,
      emoji,
      barcode,
      imageUrl,
      description,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Product name is required",
      });
    }

    const finalBarcode = normalizeBarcode(barcode);
    const finalImageUrl = normalizeImageUrl(imageUrl);

    // Check duplicate barcode for current user
    if (finalBarcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          barcode: finalBarcode,
          userId: req.userId,
        },
      });

      if (existingBarcode) {
        return res.status(409).json({
          message: "This barcode is already registered in your inventory.",
        });
      }
    }

    // Validate expiry date
    let finalExpiryDate;
    let daysLeft;

    if (expiryDate) {
      finalExpiryDate = new Date(expiryDate);

      if (Number.isNaN(finalExpiryDate.getTime())) {
        return res.status(400).json({
          message: "Invalid expiry date",
        });
      }

      daysLeft = calculateDaysLeft(finalExpiryDate);
    } else {
      daysLeft = Number(days ?? 7);

      if (!Number.isInteger(daysLeft)) {
        return res.status(400).json({
          message: "Invalid expiry days",
        });
      }

      finalExpiryDate = new Date();
      finalExpiryDate.setDate(
        finalExpiryDate.getDate() + daysLeft
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        brand: brand || null,
        quantity: qty ? String(qty) : null,
        location: place || "Kitchen",
        daysLeft,
        expiryDate: finalExpiryDate,
        category: category || "Food",
        emoji: emoji || "📦",
        barcode: finalBarcode,

        // Product image and description
        imageUrl: finalImageUrl,
        description: description || null,

        userId: req.userId,
      },
    });

    console.log("PRODUCT SAVED:", product.id);
    console.log("PRODUCT IMAGE:", product.imageUrl);

    return res.status(201).json({
      ...product,
      daysLeft,
    });
  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);

    if (isDuplicateBarcodeError(error)) {
      return res.status(409).json({
        message: "This barcode is already registered in your inventory.",
      });
    }

    return res.status(500).json({
      message: "Failed to add product",
    });
  }
};

// UPDATE USER PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const {
      name,
      brand,
      qty,
      place,
      expiryDate,
      category,
      emoji,
      barcode,
      imageUrl,
      description,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Product name is required",
      });
    }

    // Find product belonging to current user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Validate expiry date
    const expiry = new Date(expiryDate);

    if (!expiryDate || Number.isNaN(expiry.getTime())) {
      return res.status(400).json({
        message: "Valid expiry date is required",
      });
    }

    const daysLeft = calculateDaysLeft(expiry);

    // Preserve existing barcode if not provided
    const finalBarcode =
      barcode === undefined
        ? existingProduct.barcode
        : normalizeBarcode(barcode);

    // Preserve existing image if not provided
    const finalImageUrl =
      imageUrl === undefined
        ? existingProduct.imageUrl
        : normalizeImageUrl(imageUrl);

    const finalDescription =
      description === undefined
        ? existingProduct.description
        : description || null;

    // Check duplicate barcode
    if (finalBarcode) {
      const duplicateBarcode = await prisma.product.findFirst({
        where: {
          barcode: finalBarcode,
          userId: req.userId,
          id: {
            not: id,
          },
        },
      });

      if (duplicateBarcode) {
        return res.status(409).json({
          message: "This barcode is already registered in your inventory.",
        });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: {
        name: name.trim(),
        brand: brand || null,
        quantity: qty ? String(qty) : null,
        location: place || "Kitchen",
        expiryDate: expiry,
        daysLeft,
        category: category || "Food",
        emoji: emoji || "📦",
        barcode: finalBarcode,

        imageUrl: finalImageUrl,
        description: finalDescription,
      },
    });

    return res.status(200).json({
      ...updatedProduct,
      daysLeft,
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    if (isDuplicateBarcodeError(error)) {
      return res.status(409).json({
        message: "This barcode is already registered in your inventory.",
      });
    }

    return res.status(500).json({
      message: "Failed to update product",
    });
  }
};

// DELETE USER PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await prisma.product.delete({
      where: {
        id: product.id,
      },
    });

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
};