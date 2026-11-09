<div align="center">

# 🏠 Home AI
### Smart Home Inventory & Expiry Management Platform

**Organize household products. Track expiry dates. Reduce everyday food waste.**

A full-stack application built with React, Node.js, Express, Prisma and PostgreSQL, featuring barcode scanning and an AI-powered home assistant.

<a href="https://home-ai-ecru.vercel.app/">
<img src="https://img.shields.io/badge/🚀_LIVE_DEMO-Open_Home_AI-F4D35E?style=for-the-badge&labelColor=171717" alt="Live Demo" />
</a>

![React](https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=flat-square&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Runtime-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-REST_API-000000?style=flat-square&logo=express)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)

</div>

---

## 📌 Overview

**Home AI** is a full-stack smart household inventory management application. It helps users maintain a digital record of products at home, monitor expiry dates, identify products that need attention, and get AI-assisted suggestions based on their inventory.

The application combines a React dashboard with an Express REST API, PostgreSQL persistence through Prisma ORM, browser-based barcode scanning, external product lookup and a Gemini-powered assistant.

**Live application:** [https://home-ai-ecru.vercel.app/](https://home-ai-ecru.vercel.app/)

## ✨ Core Features

| Module | Capabilities |
|---|---|
| 🔐 Authentication | Registration, email/password login, Google sign-in integration, protected access and password recovery flows. |
| 📊 Dashboard | Total items, expiring-soon items, expired items and category counts. |
| 📦 Inventory Management | Create, view, update and delete product records. |
| ⏳ Expiry Tracking | Remaining-days calculation; expired, due-today and expiring-soon product views. |
| 🗓️ Expiry Calendar | Calendar-based review of product expiry dates. |
| 📷 Barcode / QR Scanning | Scan product codes in the browser using the device camera. |
| 🔎 Product Lookup | Check saved inventory and query external product databases. |
| 🤖 AI Assistant | Ask about expiry priorities, low-stock items, meal suggestions and food waste. |
| 📈 Analytics | Visual inventory and category summaries using charts. |
| 🗂️ Organization | Categorize products and record household storage locations. |

> External integrations depend on valid credentials, browser camera permission and third-party service availability. Verify each feature in the deployed build before describing it as production-ready.

## 🧰 Technology Stack

### Frontend

| Technology | Role |
|---|---|
| React | Component-based user interface |
| Vite | Frontend development and build tooling |
| JavaScript (ES6+) | Application logic |
| CSS | Styling and responsive layouts |
| Lucide React | Interface icons |
| Recharts | Dashboard charts |
| `@zxing/browser` | Browser-based barcode/QR scanning |
| Google OAuth client | Google sign-in interface |

### Backend

| Technology | Role |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API and routing |
| Prisma ORM | Database access and schema/migration management |
| JWT | Authenticated API access |
| `@google/genai` | Gemini model integration |

### Database & External Services

| Service | Role |
|---|---|
| PostgreSQL (Neon) | Persistent relational data storage |
| Google Gemini | AI assistant responses |
| Open Food Facts | Product information lookup |
| UPCitemdb | Secondary barcode product lookup |
| Vercel | Application/API deployment |

## 🏛️ System Architecture

```mermaid
flowchart TD
    USER[User] --> UI[React + Vite Frontend]
    UI --> AUTH[Authentication]
    UI --> API[Express REST API]
    AUTH --> API
    API --> MW[Authentication Middleware]
    MW --> CTRL[Routes & Controllers]
    CTRL --> ORM[Prisma ORM]
    ORM --> DB[(PostgreSQL / Neon)]
    CTRL --> GEMINI[Google Gemini API]
    CTRL --> OFF[Open Food Facts]
    CTRL --> UPC[UPCitemdb]
    DB --> ORM
    ORM --> CTRL
    GEMINI --> CTRL
    OFF --> CTRL
    UPC --> CTRL
    CTRL --> UI
```

### Request Lifecycle

1. The user interacts with the React application.
2. The frontend sends HTTP requests to the backend API.
3. Authentication middleware verifies access to protected resources.
4. Express controllers process the requested operation.
5. Prisma reads or writes application data in PostgreSQL.
6. AI and barcode lookup operations call the relevant external service.
7. The API returns JSON data and the frontend updates the interface.

## 🤖 AI Assistant & Barcode Lookup

### AI Assistant

The assistant is designed around the user's saved inventory. Example prompts:

- Which products expire this week?
- What should I use first?
- Suggest a meal using my available items.
- Show low-stock items.
- How can I reduce food waste?

The backend integrates Google's GenAI SDK with Gemini. Keep the Gemini API key on the server; never expose it in frontend code.

### Barcode Scanning Flow

1. The browser camera is accessed after user permission.
2. `@zxing/browser` reads a barcode or QR code.
3. The scanned code is checked against the user's saved inventory.
4. If needed, product lookup can query Open Food Facts and then UPCitemdb.
5. Returned product details can help populate the inventory form.

Barcode lookup depends on readable product codes and external service availability. Expiry dates should be verified by the user; they cannot be reliably inferred from a product barcode alone.

## 🗃️ Data Model

Product records include fields used by the application:

| Field | Purpose |
|---|---|
| `id` | Unique product identifier |
| `name` | Product name |
| `brand` | Product brand |
| `quantity` | Product quantity |
| `location` | Household storage location |
| `expiryDate` | Expiry date |
| `daysLeft` | Remaining days until expiry |
| `category` | Product category |
| `emoji` | Product visual identifier |
| `barcode` | Barcode value |
| `description` | Additional product information |
| `userId` | User who owns the product |

The user model also supports role-based access (`USER` / `ADMIN`) in the backend schema history. The Prisma schema in the repository is the source of truth for field types, relations, indexes and constraints.

## 🔌 API Overview

The backend is organized into REST API route groups:

| Route group | Purpose |
|---|---|
| `/api/health` | Backend health check |
| `/api/auth` | Registration, login and authentication flows |
| `/api/products` | Inventory operations and barcode lookup |
| `/api/dashboard/summary` | Dashboard statistics |
| `/api/ai` | AI assistant requests |

Authentication endpoints confirmed in the project include:

- `POST /api/auth/login`
- `POST /api/auth/google`

Check the current Express route files for exact methods, request bodies and response schemas before publishing a complete API reference.

## 🖥️ Screenshots

Add current screenshots from the deployed application to a `screenshots/` folder, then replace these placeholders.

| Dashboard | Inventory |
|:---:|:---:|
| `screenshots/dashboard.png` | `screenshots/inventory.png` |

| Barcode Scanner | AI Assistant |
|:---:|:---:|
| `screenshots/scanner.png` | `screenshots/ai-assistant.png` |

## 📁 Project Structure

This is a representative frontend/backend layout based on the project files. Keep it aligned with the actual GitHub repository.

```text
Home-AI/
│
├── client/                         # React + Vite application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── AuthPage.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
│
├── server/                         # Node.js + Express API
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   │   └── promote-admin.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## ⚙️ Run Locally

### Prerequisites

- Node.js and npm
- PostgreSQL database (local instance or Neon connection string)
- Git
- Google Gemini API key for AI functionality
- Google OAuth credentials if Google sign-in is enabled

### 1. Clone the repository

```bash
git clone <https://github.com/prateek4322/HomeAI>
cd Home-AI
```

### 2. Install dependencies

Frontend:

```bash
cd client
npm install
```

Backend — open a second terminal:

```bash
cd server
npm install
```

### 3. Configure environment variables

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Create `server/.env` using the variable names expected by your backend code. Common settings include:

```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME"
JWT_SECRET="replace_with_a_long_random_secret"
GEMINI_API_KEY="your_gemini_api_key"
```

Google OAuth and password-reset flows may require additional client IDs, frontend URLs and email-provider settings. Use the exact variable names referenced by the current source code and deployment configuration.

**Security:** Never commit `.env` files, database credentials, OAuth secrets, JWT secrets or AI API keys. Only expose `VITE_` variables that are safe to include in browser code.

### 4. Generate Prisma Client and apply migrations

From `server/`:

```bash
npx prisma generate
npx prisma migrate dev
```

Use the migration files committed with the project. For production, apply existing migrations using the production migration workflow rather than development migrations.

### 5. Start the backend

From `server/`, run the script defined in `server/package.json`. For example:

```bash
npm run dev
```

### 6. Start the frontend

From `client/`:

```bash
npm run dev
```

Open the local URL printed by Vite.

> Exact npm scripts can vary by repository version. Check each `package.json` for available commands.

## ☁️ Deployment

### Live Frontend

[https://home-ai-ecru.vercel.app/](https://home-ai-ecru.vercel.app/)

### Backend API

The frontend uses `VITE_API_URL` as its configurable API base URL. The production API URL recorded in the project configuration is:

`https://home-ai-api.vercel.app/api`

### Database

PostgreSQL is used for persistent application data, with Neon used as the hosted database.

For production:

1. Set the frontend `VITE_API_URL` to the deployed backend.
2. Configure database and authentication secrets in the backend hosting environment.
3. Configure Gemini and Google OAuth credentials in the appropriate server/client settings.
4. Apply Prisma migrations to the production database.
5. Allow the deployed frontend domain in backend CORS settings.

## 🔐 Security & Engineering Practices

- Keep secrets in environment variables.
- Validate and normalize incoming API data on the backend.
- Protect private routes with authentication middleware.
- Scope product queries to the authenticated user's ID.
- Apply role checks to admin-only operations.
- Keep AI provider keys on the server.
- Restrict CORS to trusted application origins.
- Use Prisma migrations to manage database schema changes.
- Avoid returning sensitive authentication or account data in API responses.

## 🛣️ Roadmap

Potential future improvements:

- [ ] Automated email / push notifications for upcoming expiry dates.
- [ ] More robust product image and label recognition.
- [ ] Inventory export (CSV / PDF).
- [ ] Advanced filtering and search.
- [ ] Household sharing and multiple household members.
- [ ] PWA support and offline-friendly inventory access.
- [ ] Automated tests for API routes and core user flows.

## 👨‍💻 Author

**Prateek Kumar**  
B.Tech — Computer Science & Engineering  
NITRA Technical Campus, Ghaziabad

- **Live Project:** [Home AI](https://home-ai-ecru.vercel.app/)
- **GitHub:** (https://github.com/prateek4322/)

---

<div align="center">

**Home AI — A smarter way to manage what you keep at home.**

Built with React · Node.js · Express · Prisma · PostgreSQL · Gemini

</div>
