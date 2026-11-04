const API_BASE =
import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// GET AUTH TOKEN
export const getToken = () => {
return localStorage.getItem("homeai_token");
};

// AUTH HEADERS
const getAuthHeaders = () => {
const token = getToken();

return {
"Content-Type": "application/json",
...(token && {
Authorization: `Bearer ${token}`,
}),
};
};

// CALCULATE DAYS LEFT
export const calculateDaysLeft = (expiryDate, fallbackDays = 7) => {
if (!expiryDate) return fallbackDays;

const today = new Date();
today.setHours(0, 0, 0, 0);

const expiry = new Date(expiryDate);

if (Number.isNaN(expiry.getTime())) {
return fallbackDays;
}

expiry.setHours(0, 0, 0, 0);

return Math.ceil(
(expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
);
};

// FORMAT PRODUCT DATA
const formatProduct = (product) => {
const daysLeft = calculateDaysLeft(
product.expiryDate,
product.daysLeft
);

return {
...product,
qty: product.quantity,
place: product.location,
days: daysLeft,
daysLeft,
expiryDate: product.expiryDate || null,
barcode: product.barcode || null,
};
};

// PREPARE PRODUCT PAYLOAD
const prepareProductPayload = (product) => {
const payload = { ...product };

if (Object.prototype.hasOwnProperty.call(payload, "barcode")) {
payload.barcode = String(payload.barcode ?? "").trim() || null;
}

return payload;
};

// SIGNUP
export const signupUser = async (userData) => {
const response = await fetch(`${API_BASE}/auth/signup`, {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify(userData),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "Signup failed");
}

localStorage.setItem("homeai_token", data.token);
localStorage.setItem("homeai_user", JSON.stringify(data.user));

return data;
};

// LOGIN
export const loginUser = async (credentials) => {
const response = await fetch(`${API_BASE}/auth/login`, {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify(credentials),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "Login failed");
}

localStorage.setItem("homeai_token", data.token);
localStorage.setItem("homeai_user", JSON.stringify(data.user));

return data;
};

// GOOGLE LOGIN / SIGNUP
export const googleLoginUser = async (credential) => {
  const response = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Google authentication failed");
  }

  localStorage.setItem("homeai_token", data.token);
  localStorage.setItem("homeai_user", JSON.stringify(data.user));

  return data;
};

// LOGOUT
export const logoutUser = () => {
localStorage.removeItem("homeai_token");
localStorage.removeItem("homeai_user");
};

// GET CURRENT USER
export const getStoredUser = () => {
try {
const user = localStorage.getItem("homeai_user");
return user ? JSON.parse(user) : null;
} catch {
return null;
}
};

// GET PRODUCTS
export const getProducts = async () => {
const response = await fetch(`${API_BASE}/products`, {
headers: getAuthHeaders(),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "Failed to fetch products");
}

return data.map(formatProduct);
};

// ADD PRODUCT
export const createProduct = async (product) => {
const response = await fetch(`${API_BASE}/products`, {
method: "POST",
headers: getAuthHeaders(),
body: JSON.stringify(prepareProductPayload(product)),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "Failed to add product");
}

return formatProduct(data);
};

// UPDATE PRODUCT
export const updateProduct = async (id, product) => {
const response = await fetch(`${API_BASE}/products/${id}`, {
method: "PUT",
headers: getAuthHeaders(),
body: JSON.stringify(prepareProductPayload(product)),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "Failed to update product");
}

return formatProduct(data);
};

// DELETE PRODUCT
export const removeProduct = async (id) => {
const response = await fetch(`${API_BASE}/products/${id}`, {
method: "DELETE",
headers: getAuthHeaders(),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "Failed to delete product");
}

return data;
};

// BARCODE PRODUCT LOOKUP
export const lookupProductByBarcode = async (barcode) => {
const cleanBarcode = String(barcode || "").trim();

if (!/^\d{8,14}$/.test(cleanBarcode)) {
throw new Error("Invalid barcode. Please scan a valid product barcode.");
}

const response = await fetch(`${API_BASE}/products/lookup`, {
method: "POST",
headers: getAuthHeaders(),
body: JSON.stringify({
barcode: cleanBarcode,
}),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "Product lookup failed");
}

return data;
};

// DASHBOARD SUMMARY
export const getDashboardSummary = async () => {
const response = await fetch(`${API_BASE}/dashboard/summary`, {
headers: getAuthHeaders(),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "Dashboard request failed");
}

return data;
};

// AI ASSISTANT
export const askHomeAI = async (message) => {
const response = await fetch(`${API_BASE}/ai/chat`, {
method: "POST",
headers: getAuthHeaders(),
body: JSON.stringify({ message }),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.message || "AI request failed");
}

return data;
};
