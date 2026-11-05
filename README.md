
🏠 Home AI
Your home. Your inventory. One intelligent dashboard.
A smarter way to organize household products, track expiry dates, and stay ahead of waste.


￼ ￼ 



￼ ￼ ￼ ￼ ￼ ￼ ￼

✨ What is Home AI?
Home AI is a smart household inventory management web application designed to help users keep their everyday products organized. Add products, save their details, monitor expiry dates, and view inventory information from one dashboard.
The aim is simple: know what you have, where it is, and when it expires.
🚀 Features
Feature
Description
🔐 User Authentication
Create an account and securely access your inventory.
📦 Product Management
Add, view, and manage household products.
🏷️ Barcode Details
Save barcode numbers to identify products.
⏳ Expiry Tracking
Track expiry dates and days remaining.
🚦 Expiry Status
Identify expired, expiring-soon, and safe products.
📊 Smart Dashboard
View inventory totals and expiry summaries.
🗂️ Product Information
Store brand, quantity, category, location, and description.
Features listed here describe the intended/current project scope. Availability can vary with the deployed build.
🧰 Tech Stack

Frontend
Backend
Database & ORM
React + Vite
Node.js
PostgreSQL
JavaScript
Express.js
Prisma ORM

🏗️ Application Architecture
flowchart TD
    A[User] --> B[React + Vite Frontend]
    B --> C[Express REST API]
    C --> D[Authentication Middleware]
    C --> E[Prisma ORM]
    E --> F[(PostgreSQL Database)]
    F --> E
    E --> C
    C --> B
📸 Preview
Visit the live application:

🌐 Open Home AI — Live Demo


Dashboard
Inventory
Add your dashboard screenshot here
Add your inventory screenshot here
⚙️ Run Locally
1. Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Home-AI
2. Install frontend dependencies
cd client
npm install
3. Install backend dependencies
Open a second terminal:
cd server
npm install
4. Configure environment variables
Create server/.env:
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME"
JWT_SECRET="your_strong_secret"
Create client/.env:
VITE_API_URL=http://localhost:5000/api
Use your own database credentials and secrets. Never commit .env files.
5. Set up Prisma
From the server directory:
npx prisma generate
npx prisma migrate dev
Run migrations according to the existing project schema.
6. Start the backend
From server:
npm run dev
7. Start the frontend
From client:
npm run dev
Open the local URL shown in your terminal by Vite.
📁 Project Structure
Home-AI/
│
├── client/                 # React + Vite frontend
│   ├── src/
│   └── package.json
│
├── server/                 # Node.js + Express backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── prisma/
│   └── package.json
│
└── README.md
Adjust this tree to match the actual repository structure.
🗺️ Roadmap
[x]
React + Vite frontend foundation
[x]
Express backend foundation
[x]
PostgreSQL and Prisma integration
[x]
Product inventory data model
[ ]
Camera-based barcode scanning
[ ]
Expiry reminder notifications
[ ]
Product image upload
[ ]
Advanced search, filters, and analytics
[ ]
Progressive Web App (PWA) support
🔒 Security Notes
Store secrets in environment variables.
Validate incoming API data on the server.
Protect private routes with authentication middleware.
Restrict inventory access to its owner.
Keep credentials and private configuration out of Git.
👨‍💻 Developer
Prateek Kumar
B.Tech — Computer Science & Engineering
🌐 Live Project: home-ai-ecru.vercel.app
💻 GitHub: Add your GitHub profile link

🏡 Make your home inventory smarter with Home AI.
Built with React, Node.js, Express, Prisma & PostgreSQL.