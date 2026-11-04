const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product";
const UPCITEMDB_URL = "https://api.upcitemdb.com/prod/trial/lookup";

// Fetch with timeout
const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
const controller = new AbortController();

const timeoutId = setTimeout(() => {
controller.abort();
}, timeout);

try {
const response = await fetch(url, {
...options,
signal: controller.signal,
});


return response;


} finally {
clearTimeout(timeoutId);
}
};

// Normalize product data
const normalizeProduct = (product, source, barcode) => {
if (!product) return null;

const name = product.name || product.title || product.product_name;

if (!name) return null;

return {
barcode,
name,
brand: product.brand || product.brands || "",
quantity:
  product.quantity ||
  product.size ||
  product.weight ||
  product.volume ||
  "",
category: product.category || product.categories || "Food",
image: product.image || product.image_url || "",
description: product.description || "",
source,
};
};

// Open Food Facts lookup
const lookupOpenFoodFacts = async (barcode) => {
try {
const url =
`${OPEN_FOOD_FACTS_URL}/${encodeURIComponent(barcode)}.json` +
"?fields=product_name,brands,quantity,categories,image_url";


const response = await fetchWithTimeout(url);

if (!response.ok) return null;

const data = await response.json();

if (data.status !== 1 || !data.product) {
  return null;
}

const product = data.product;

return normalizeProduct(
  {
    name: product.product_name,
    brand: product.brands,
    quantity:
  product.quantity ||
  product.size ||
  product.weight ||
  product.volume ||
  "",
    category: product.categories,
    image: product.image_url,
  },
  "Open Food Facts",
  barcode
);


} catch (error) {
console.error("OPEN FOOD FACTS ERROR:", error.message);
return null;
}
};

// UPCitemdb lookup
const lookupUPCItemDB = async (barcode) => {
try {
const response = await fetchWithTimeout(UPCITEMDB_URL, {
method: "POST",
headers: {
"Content-Type": "application/json",
Accept: "application/json",
},
body: JSON.stringify({
upc: barcode,
}),
});


if (!response.ok) {
  console.warn("UPCITEMDB RESPONSE:", response.status);
  return null;
}

const data = await response.json();

if (!data.items || data.items.length === 0) {
  return null;
}

const product = data.items[0];

return normalizeProduct(
  {
    title: product.title,
    brand: product.brand,
    quantity: product.size || product.dimension || "",
    category: product.category || "",
    image: product.images?.[0] || "",
    description: product.description || "",
  },
  "UPCitemdb",
  barcode
);

} catch (error) {
console.error("UPCITEMDB ERROR:", error.message);
return null;
}
};

// Main barcode lookup function
export const lookupProductByBarcode = async (barcode) => {
const cleanBarcode = String(barcode || "").trim();

if (!/^\d{8,14}$/.test(cleanBarcode)) {
throw new Error("Invalid barcode format");
}

// First search Open Food Facts
const foodProduct = await lookupOpenFoodFacts(cleanBarcode);

if (foodProduct) {
return {
found: true,
product: foodProduct,
};
}

// Then search UPCitemdb
const upcProduct = await lookupUPCItemDB(cleanBarcode);

if (upcProduct) {
return {
found: true,
product: upcProduct,
};
}

return {
found: false,
product: null,
message: "Product not found in available databases.",
};
};
