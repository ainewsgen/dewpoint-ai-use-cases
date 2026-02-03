import express from 'express';

// Global Error Handlers (Must be first)
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection:', reason);
});
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { requireAuth, requireAdmin, AuthRequest } from './middleware/auth'; // Import Auth Middleware
import authRoutes from './routes/auth';
import authEnhancedRoutes from './routes/auth-enhanced';
import leadsRoutes from './routes/leads';
import cmsRoutes from './routes/cms';
import usersRoutes from './routes/users';
import integrationsRoutes from './routes/integrations';
import scanRoutes from './routes/scan';
import generateRoutes from './routes/generate';
import usageRoutes from './routes/usage';
import debugUsersRoutes from './routes/debug-users';
import { runMigrations } from './db/migrate';
import { sql } from 'drizzle-orm';
import { db } from './db';
import * as schema from './db/schema';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ... middlewares ...

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.CLIENT_URL || 'https://dewpoint-ai-use-cases.onrender.com')
        : 'http://localhost:5173',
    credentials: true, // Allow cookies
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Debug Routes
app.use('/api/debug', debugUsersRoutes);


// Custom Middleware
import { shadowTracking } from './middleware/shadow';
app.use(shadowTracking);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: 'v3.23', timestamp: new Date().toISOString() });
});

app.get('/ping', (req, res) => {
    res.send('pong');
});





import icpsRoutes from './routes/icps';
import libraryRoutes from './routes/library';
import syncLibraryRoutes from './routes/sync-library';

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
app.use('/api', icpsRoutes); // Industry ICPs
app.use('/api', libraryRoutes); // Use Case Library
app.use('/api', libraryRoutes); // Use Case Library
app.use('/api', syncLibraryRoutes); // Sync Logic

import systemPromptRoutes from './routes/system-prompt';
app.use('/api/admin', systemPromptRoutes); // Persistent Config





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

            -- LIBRARY SCHEMA UPDATE (Auto-Fix)
            ALTER TABLE use_case_library ADD COLUMN IF NOT EXISTS data JSONB;
            ALTER TABLE use_case_library ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
        `);
        console.log("Fixed Schema: Created api_usage table and updated library.");
        res.json({ success: true, message: "Created api_usage table (Emergency Fix)" });
    } catch (error: any) {
        console.error("Fix Schema Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// DRY RUN DIAGNOSTIC (Full Pipeline Test)
import { integrations } from './db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './utils/encryption';
import { OpenAIService } from './services/openai';
import { GeminiService } from './services/gemini';
import { UsageService } from './services/usage';



// ...

app.post('/api/admin/dry-run', requireAuth, requireAdmin, async (req, res) => {
    const trace: string[] = [];
    const log = (msg: string) => {
        console.log(`[DryRun] ${msg}`);
        trace.push(msg);
    };

    try {
        log("Starting Dry Run...");
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || 1;
        log(`User Context: ID ${userId}`);

        // 1. Dummy Data
        const companyData = {
            role: "CTO",
            industry: "Technology",
            painPoint: "Inefficient Deployment Pipelines",
            stack: ["AWS", "GitHub Actions"],
            url: "https://example.com"
        };
        log("Step 1: Dummy Data Prepared");

        // 2. Integration Check
        const integrationsList = await db.select().from(integrations).where(eq(integrations.enabled, true));
        const activeInt = integrationsList.find(i => i.enabled && (i.apiKey || i.apiSecret));

        if (!activeInt) throw new Error("No active integration found");
        log(`Step 2: Integration Found (${activeInt.name})`);

        const apiKey = activeInt.apiKey ? decrypt(activeInt.apiKey) : '';
        if (!apiKey) throw new Error("API Key missing or invalid");

        // 3. System Prompt
        const systemPrompt = "You are a test. Return valid JSON containing a 'blueprints' array with one item: { title: 'Test', public_view: {}, admin_view: {} }.";
        log("Step 3: System Prompt Prepared");

        // 4. AI Call
        log("Step 4: Calling AI Provider (This may take 10-20s)...");
        const metadata = activeInt.metadata as any || {};
        const modelId = metadata.model || 'gpt-4o';
        const aiParams = {
            systemPrompt,
            userContext: JSON.stringify(companyData),
            model: modelId,
            apiKey
        };

        let result;
        if (activeInt.name.toLowerCase().includes('gemini')) {
            result = await GeminiService.generateJSON(aiParams);
        } else {
            result = await OpenAIService.generateJSON(aiParams);
        }
        log("Step 4: AI Response Received ✅");

        // 5. Usage Logging
        log("Step 5: Logging Usage to DB...");
        try {
            await UsageService.logUsage(userId, 50, 50, modelId);
            log("Step 5: DB Write Successful ✅");
        } catch (dbErr: any) {
            log(`Step 5 FAILED: DB Write Error - ${dbErr.message}`);
            // Don't throw, we want to return the trace
        }

        // 6. verification
        log("Step 6: Verifying Response Structure...");
        if (result.blueprints || Array.isArray(result)) {
            log("Step 6: Structure Looks Valid ✅");
        } else {
            log("Step 6 Warning: Unexpected JSON structure");
        }

        res.json({ success: true, trace });

    } catch (error: any) {
        log(`FATAL ERROR: ${error.message}`);
        res.status(500).json({ success: false, trace, error: error.message });
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

// Serve static frontend files (Robust check)
const staticPath = path.join(__dirname, '../..');
const distPath = path.join(staticPath, 'dist');
const fs = require('fs');

if (fs.existsSync(distPath)) {
    console.log(`Serving static files from ${distPath}`);
    app.use(express.static(distPath));

    // Catch-all for SPA
    app.use((req, res) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        } else {
            res.status(404).send('Antigravity Server: Route Not Found');
        }
    });
} else {
    console.warn(`Static files not found at ${distPath}`);
    app.get('/', (req, res) => res.send('API Server Running (Static files not found)'));
}

// Start server immediately
const server = app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`📊 API available at http://0.0.0.0:${PORT}/api`);

    // AUTO-MIGRATE ON START
    try {
        await db.execute(sql`
            ALTER TABLE use_case_library ADD COLUMN IF NOT EXISTS data JSONB;
            ALTER TABLE use_case_library ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
        `);
        console.log("✅ Library Schema Auto-Migrated");
    } catch (e) {
        console.error("Schema Migration Warning:", e);
    }

    // Self-healing: Ensure Schema is correct (SQL Injection for migration reliability)
    // Run this async without blocking, or await if critical. We'll fire-and-forget but log errors.
    (async () => {
        try {
            console.log("🛠️ Checking Database Schema...");

            // 1. Create Companies Table (Missing in Prod)
            await db.execute(sql`
                CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    url TEXT,
                    industry TEXT,
                    naics_code TEXT,
                    role TEXT,
                    size TEXT,
                    pain_point TEXT,
                    stack JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // FORCE PATCH: Add naics_code if missing (likely culprit for failing inserts)
            await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS naics_code TEXT;`);
            await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS scanner_source TEXT;`);
            await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;`);
            await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS stack JSONB;`);

            // 2. Create Use Case Library Table (Was missing)
            await db.execute(sql`
                CREATE TABLE IF NOT EXISTS use_case_library (
                    id SERIAL PRIMARY KEY,
                    industry TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    roi_estimate TEXT,
                    difficulty TEXT,
                    tags JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // 2. Fix Leads Table (Schema Mismatch)
            // Add reference to companies
            await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);`);
            // Add recipes (JSONB)
            await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS recipes JSONB DEFAULT '[]'::jsonb;`);
            // Add shadow_id
            await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS shadow_id TEXT;`);
            // Add fingerprint
            await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT;`);

            // Force add 'metadata' column if missing
            await db.execute(sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS metadata JSONB;`);

            // Force add 'name' column (critical fix)
            await db.execute(sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS name TEXT;`);

            // Force add 'provider' column matching schema (was missing in prod DB likely)
            await db.execute(sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS provider TEXT;`);

            // Force add 'priority' column
            await db.execute(sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;`);

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
