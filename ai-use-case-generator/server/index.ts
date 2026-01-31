import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { requireAuth, requireAdmin } from './middleware/auth'; // Import Auth Middleware
import authRoutes from './routes/auth';
import authEnhancedRoutes from './routes/auth-enhanced';
import leadsRoutes from './routes/leads';
import cmsRoutes from './routes/cms';
import usersRoutes from './routes/users';
import integrationsRoutes from './routes/integrations';
import scanRoutes from './routes/scan';
import generateRoutes from './routes/generate';
import usageRoutes from './routes/usage';
import { runMigrations } from './db/migrate';
import { sql } from 'drizzle-orm';
import { db } from './db';
import * as schema from './db/schema';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.CLIENT_URL || 'https://dewpoint-ai-use-cases.onrender.com')
        : 'http://localhost:5173',
    credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// Health Check (before other API routes for priority)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: 'v3.20', timestamp: new Date().toISOString() });
});





// API Routes
app.use('/api/auth', authEnhancedRoutes); // Enhanced auth with JWT
app.use('/api/auth', authRoutes); // Legacy auth routes (if needed)
app.use('/api', leadsRoutes);
app.use('/api', cmsRoutes);
app.use('/api/admin', usersRoutes); // User management
app.use('/api', integrationsRoutes); // Enhanced integrations
app.use('/api', scanRoutes); // Server-side scanning
app.use('/api', generateRoutes); // AI Generation
app.use('/api/admin', usageRoutes); // Observability & Usage Stats





// EMERGENCY REPAIR ROUTE (Bypassing Router complexities)
app.post('/api/admin/repair-schema', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log("Attempting to repair schema (Emergency Route)...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS api_usage (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                model TEXT,
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                total_cost DECIMAL(10, 6),
                timestamp TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Fixed Schema: Created api_usage table.");
        res.json({ success: true, message: "Created api_usage table (Emergency Fix)" });
    } catch (error: any) {
        console.error("Fix Schema Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Deep DB Diagnostic
app.get('/api/debug/db-check', async (req, res) => {
    try {
        // Raw SQL check
        const rawResult = await db.execute(sql`SELECT id, name, enabled, metadata FROM integrations ORDER BY id DESC`);

        // Drizzle Select check
        // @ts-ignore
        const selectResult = await db.select().from(schema.integrations).limit(5);

        res.json({
            status: 'ok',
            raw_count: rawResult.rows.length,
            raw_rows: rawResult.rows,
            drizzle_rows: selectResult,
            db_url_set: !!process.env.DATABASE_URL
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Serve static frontend files in production (AFTER API routes)
if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../..');
    app.use(express.static(path.join(staticPath, 'dist')));

    // Catch-all: send index.html for any remaining routes (SPA routing)
    app.use((req, res) => {
        res.sendFile(path.join(staticPath, 'dist', 'index.html'));
    });
}

// Start server immediately
const server = app.listen(PORT, () => {
    console.log(`📊 API available at http://localhost:${PORT}/api`);

    // Self-healing: Ensure Schema is correct (SQL Injection for migration reliability)
    // Run this async without blocking, or await if critical. We'll fire-and-forget but log errors.
    (async () => {
        try {
            console.log("🛠️ Checking Database Schema...");
            // Force add 'metadata' column if missing
            await db.execute(sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS metadata JSONB;`);

            // Force add 'name' column (critical fix)
            await db.execute(sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS name TEXT;`);

            // Force add 'provider' column matching schema (was missing in prod DB likely)
            await db.execute(sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS provider TEXT;`);

            // Make 'provider' nullable (backward compat)
            await db.execute(sql`ALTER TABLE integrations ALTER COLUMN provider DROP NOT NULL;`);
            console.log("✅ Database Schema Verified/Patched.");
        } catch (err) {
            console.error("⚠️ Schema Patch Warning:", err);
        }
    })();
});

// Run migrations in background
runMigrations().catch(console.error);
