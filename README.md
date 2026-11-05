
Home AI
Smart Household Inventory Management System
A full-stack web application for organizing household products, monitoring expiry dates, and managing inventory through a centralized dashboard.


Project Overview
Home AI is a full-stack inventory management application designed to help users maintain a structured record of household products. Users can save product information, organize items, track expiry dates, and review inventory summaries from a dashboard.
The project demonstrates practical implementation of frontend development, REST API integration, backend authentication, relational database management, and ORM-based data operations.
Live Application: https://home-ai-ecru.vercel.app/
Key Features
Feature
Description
User Authentication
User registration and login with protected application access.
Inventory Management
Add, view, and manage household product records.
Product Information
Maintain product name, brand, quantity, category, and description.
Expiry Date Tracking
Store expiry dates and calculate remaining days.
Storage Organization
Save the location where each product is stored.
Barcode Information
Store barcode identifiers with product records.
Dashboard Summary
Display inventory and expiry-related statistics.
Expiry Status
Identify expired, expiring-soon, and safe products.
Technology Stack
Frontend
React — Component-based user interface.
Vite — Development server and frontend build tooling.
JavaScript (ES6+) — Application logic.
CSS — Styling and responsive interface.
Backend
Node.js — JavaScript runtime.
Express.js — REST API and server-side routing.
Prisma ORM — Database queries and schema management.
Database & Deployment
PostgreSQL — Relational database.
Vercel — Live frontend deployment.
System Architecture
flowchart TD
    U[User] --> FE[React + Vite Frontend]
    FE -->|HTTP Requests / JSON| API[Node.js + Express REST API]
    API --> AUTH[Authentication Middleware]
    AUTH --> CTRL[Controllers]
    CTRL --> ORM[Prisma ORM]
    ORM --> DB[(PostgreSQL Database)]
    DB --> ORM
    ORM --> CTRL
    CTRL -->|JSON Response| FE
Application Workflow
A user creates an account or logs in.
The frontend sends requests to the Express backend.
Backend middleware validates access to protected routes.
Controllers process the requested inventory operation.
Prisma communicates with PostgreSQL.
The API returns a response that the React interface displays.
Project Structure
Home-AI/
│
├── client/                         # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Application pages
│   │   ├── context/                # Shared application state (if present)
│   │   ├── services/               # API requests (if present)
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── server/                         # Express backend
│   ├── config/                     # Database configuration
│   ├── controllers/                # Request handlers
│   ├── middleware/                 # Authentication and validation
│   ├── routes/                     # API route definitions
│   ├── prisma/                     # Prisma schema and migrations
│   ├── package.json
│   └── ...
│
└── README.md
The tree is a representative overview. Keep it aligned with the folders in the current repository.
Getting Started
Follow these steps to run the application locally.
Prerequisites
Make sure the following are installed:
Node.js
npm
PostgreSQL
Git
1. Clone the repository
git clone <https://github.com/prateek4322/HomeAI>
cd Home-AI
2. Install frontend dependencies
cd client
npm install
3. Install backend dependencies
Open a separate terminal:
cd server
npm install
4. Configure environment variables
Create a .env file inside the server directory:
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME"
JWT_SECRET="your_secure_jwt_secret"
If the frontend uses an API base URL, create client/.env:
VITE_API_URL=http://localhost:5000/api
Replace the example values with your own configuration. Add any additional variables required by your code.
5. Generate Prisma Client and run migrations
From the server directory:
npx prisma generate
npx prisma migrate dev
Use the migration workflow appropriate to your existing database and schema.
6. Start the backend
From the server directory, run the development script defined in server/package.json. For example:
npm run dev
7. Start the frontend
From the client directory:
npm run dev
Open the local development URL displayed by Vite in your terminal.
Database Design
The product model stores information used by the inventory workflow. Fields in the current implementation include:
Field
Purpose
id
Unique product identifier
name
Product name
brand
Brand name
quantity
Available quantity
location
Household storage location
expiryDate
Product expiry date
daysLeft
Remaining days until expiry
category
Product category
emoji
Product visual identifier
barcode
Product barcode value
description
Additional product details
userId
Associated user
The Prisma schema in the repository is the definitive source for field types, defaults, relations, and constraints.
Engineering Highlights
This project provides hands-on experience with:
Building reusable interfaces using React components.
Managing frontend state and connecting UI components to APIs.
Designing REST API endpoints with Express.js.
Separating routes, controllers, middleware, and configuration.
Connecting a Node.js application to PostgreSQL through Prisma ORM.
Modeling relational data for user-specific inventory.
Handling environment-based configuration for local and deployed environments.
Deploying a frontend application using Vercel.
Security Considerations
Keep database credentials and secret keys in environment variables.
Never commit .env files or production secrets.
Validate request data on the backend.
Protect private endpoints with authentication middleware.
Ensure users can access only records associated with their account.
Configure production CORS and deployment environment variables carefully.
Future Enhancements
Camera-based barcode scanning.
Automated expiry reminders and notifications.
Product image upload.
Advanced search, sorting, and category filters.
Inventory activity history.
Progressive Web App support.
Deployment
The live frontend is deployed on Vercel:
https://home-ai-ecru.vercel.app/
For a production deployment, configure the frontend API URL and backend/database environment variables in the relevant hosting platforms. Ensure the deployed backend URL is used by the frontend.
Author
Prateek Kumar
B.Tech, Computer Science & Engineering
NITRA Technical Campus, Ghaziabad
Live Project: https://home-ai-ecru.vercel.app/
GitHub: github.com/prateek4322

Home AI — Bringing structure and visibility to everyday household inventory.