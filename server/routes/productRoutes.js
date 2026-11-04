import express from "express";

import {
getProducts,
addProduct,
deleteProduct,
updateProduct
} from "../controllers/productController.js";

import {
lookupProduct
} from "../controllers/productLookupController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All product routes require authentication
router.use(protect);

// Barcode lookup
router.post("/lookup", lookupProduct);

// Product CRUD
router.get("/", getProducts);
router.post("/", addProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
