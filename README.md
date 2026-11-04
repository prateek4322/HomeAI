# HomeAI — Full-stack starter (Phase 2)

## Stack
React + Vite + JavaScript frontend; Node.js + Express REST API backend.
Inventory data persists in `server/data/products.json` for local prototyping.

## Requirements
Node.js 18+ and npm.

## Install
From the project root:
```bash
npm install
npm --prefix server install
```

## Run both frontend and backend
```bash
npm run dev
```
Frontend: http://localhost:5173  
Backend: http://localhost:5000  
Health check: http://localhost:5000/api/health

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health |
| GET | `/api/products` | List inventory |
| POST | `/api/products` | Add product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/dashboard/summary` | Inventory counts |
| POST | `/api/ai/chat` | Inventory-aware demo assistant |

## What works
- Frontend loads inventory from backend.
- Add/delete product actions call REST endpoints.
- Product data persists across backend restarts.
- Assistant sends prompts to backend and receives inventory-aware demo responses.
- Frontend falls back to local demo behavior if backend is offline.

## Production work still required
JSON-file storage is for local prototyping only. Before multi-user deployment, use PostgreSQL/Supabase, add authentication and per-user authorization, input validation, rate limiting, and connect a real AI provider through server-side environment variables. Never expose AI keys in frontend code.
