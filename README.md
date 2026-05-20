# 🚀 Tour & Travels SQLite API Server

This is a highly optimized, separate Express.js API backend running **SQLite** as the primary database. 

It acts as a secure, fast, and completely free database query layer for your Next.js frontend application. By running this backend, your Next.js application has zero direct PostgreSQL database requirements, eliminating hosting costs and query caps!

---

## ⚙️ Architecture & Features

1. **RPC Database Client Proxy:** The server exposes secure `/api/prisma` (single queries) and `/api/prisma/transaction` (batch transactions) endpoints. The Next.js frontend connects to these endpoints via an elegant JS `Proxy` in `src/lib/prisma.ts` which has a **100% identical API signature** to Prisma Client, enabling us to move all 50+ files to the new backend with zero refactoring!
2. **SQLite Array & JSON Serializer:** Since SQLite does not natively support array types (like `String[]`), the server automatically serializes arrays/objects into JSON text strings for storage, and deserializes them back into standard JavaScript arrays/objects when returning data. Your Next.js app has absolutely no idea it is querying an SQLite database instead of Postgres!
3. **Seeded on First Boot:** The server automatically seeds the entire database using your backup `backups/db_backup_2026-04-27T18-21-02-743Z.json` on its very first launch on Render!
4. **Token Security:** The server is protected by a secure authorization token (`x-api-key`), ensuring only your authenticated Next.js frontend can make database queries.

---

## 🚀 How to Run Locally

To test the backend and frontend together on your local computer:

1. **Start the Express Server:**
   ```bash
   cd server
   npm run dev
   ```
   *The server will boot on port `3001` and initialize a local database at `server/prisma/dev.db`.*

2. **Configure Next.js Frontend:**
   Make sure the `.env` file of your Next.js frontend has the following variables:
   ```env
   NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"
   BACKEND_API_KEY="himvigo-super-secret-key-2026"
   ```

3. **Start Next.js Frontend:**
   ```bash
   npm run dev
   ```

---

## ☁️ How to Deploy on Render (Free + Persistent Volume)

To deploy the database server to Render, follow these steps:

### Option A: Standard Manual Deploy (Recommended)
1. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your Git repository.
3. In the creation wizard, fill out the following settings:
   - **Name:** `tour-travels-backend`
   - **Runtime:** `Node`
   - **Root Directory:** `server` (Important!)
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `./start.sh` (This handles database syncing, automated seeding, and starting Express)
4. Under **Advanced Options**, add a **Persistent Disk**:
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB` (This is more than enough for SQLite, and is completely free)
5. Add the following **Environment Variables**:
   - `PORT`: `3001`
   - `API_SECRET_KEY`: `himvigo-super-secret-key-2026`
   - `DATABASE_URL`: `file:/var/data/tour-travels.db` *(This points SQLite to save its database file directly on the persistent disk so your data is 100% safe across server restarts & deployments!)*

### Option B: Render Blueprint Deployment
Alternatively, you can go to the **Blueprints** tab on Render, upload the repository, and Render will automatically parse the `server/render.yaml` file to configure the web service, persistent disk, environment variables, and build configurations in one go!

---

## 🔗 Connect to the Frontend
Once your Render backend is deployed, Render will provide a **live URL** (e.g. `https://tour-travels-backend.onrender.com`).

Simply update your Next.js production environment variables (e.g. in your Vercel Dashboard) with:
```env
NEXT_PUBLIC_BACKEND_URL="https://your-backend-name.onrender.com"
BACKEND_API_KEY="himvigo-super-secret-key-2026"
```
Redeploy the frontend, and you're good to go!
