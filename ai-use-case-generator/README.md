# AI Use Case Generator (aka Dewpoint Strategy App)

A full-stack application for generating AI implementation blueprints ("recipes") for businesses based on their industry and pain points.

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, Drizzle ORM
- **Database:** PostgreSQL (Neon / Render)
- **AI Engine:** OpenAI (GPT-4o), Google Gemini

## 🚀 Key Features
- **Blueprint Generation:** Dynamic AI generation of use cases.
- **Admin Dashboard:** Manage users, view leads, and configure AI integrations.
- **Budget Control:** Set daily hard limits (USD) to prevent AI cost overruns.
- **CMS:** Manage announcements and library content.

## 📦 Deployment
The app is configured for deployment on **Render**.

### Build Command
```bash
npm install && npm run build
```
This runs:
1.  `npm run build:server` (Compiles TypeScript backend)
2.  `npx vite build` (Compiles React frontend)

### Start Command
```bash
npm start
```
(Runs `node dist/server/index.js`)

## 🔧 Environment Variables
Required in `.env`:
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Secret for user authentication.
- `OPENAI_API_KEY`: (Optional) System-level fallback key.
- `GEMINI_API_KEY`: (Optional) System-level fallback key.

## 🐛 Debugging
- **Debug Routes:**
    - `/api/debug/schema-check`: Verifies Database-to-ORM mapping.
    - `/api/health`: Simple uptime check.
- **Admin Panel:**
    - Go to "Observability" tab to view real-time Usage Stats and Integration details.
    - Use "Test Connection" in Integrations tab to verify API Keys.

## 📝 Known Placeholders
See `placeholder_catalog.md` for a list of pending features (e.g. Password Reset Email).
