import express from 'express';
import fs from 'fs';

// Global Error Handlers (Must be first)
process.on('uncaughtException', (err) => {
    logger.error('CRITICAL: Uncaught Exception', err);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('CRITICAL: Unhandled Rejection', reason);
});
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './utils/logger';
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




// Secure Headers (Audit Remediation)
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"); // Adjusted for React/Vite
    next();
});

// Custom Middleware
import { shadowTracking } from './middleware/shadow';
app.use(shadowTracking);

app.use((req, res, next) => {
    if (req.path.includes('integrations')) {
        console.log(`[DEBUG] ${req.method} ${req.path}`);
    }
    next();
});

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
import { adminIcpsRouter } from './routes/admin-icps'; // Fixed Import

// API Routes
app.use('/api/auth', authEnhancedRoutes); // Enhanced auth with JWT
app.use('/api/auth', authRoutes); // Legacy auth routes (if needed)
app.use('/api', leadsRoutes);
app.use('/api', cmsRoutes);
app.use('/api', integrationsRoutes); // Enhanced integrations - Moved up
app.use('/api/admin', usersRoutes); // User management
app.use('/api', scanRoutes); // Server-side scanning
app.use('/api', generateRoutes); // AI Generation
app.use('/api/admin', usageRoutes); // Observability & Usage Stats
app.use('/api/admin/icps', adminIcpsRouter); // Register ICP Manager
app.use('/api', icpsRoutes); // Industry ICPs
app.use('/api', libraryRoutes); // Use Case Library
app.use('/api', syncLibraryRoutes); // Sync Logic

import systemPromptRoutes from './routes/system-prompt';
app.use('/api/admin', systemPromptRoutes); // Persistent Config





// EMERGENCY REPAIR ROUTE (Bypassing Router complexities)
app.post('/api/admin/repair-schema', requireAuth, requireAdmin, async (req, res) => {
    try {
        logger.warn("Attempting to repair schema (Emergency Route)...");
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
            ALTER TABLE use_case_library ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
        `);
        logger.info("Fixed Schema: Created api_usage table and updated library.");
        res.json({ success: true, message: "Created api_usage table (Emergency Fix)" });
    } catch (error: any) {
        logger.error("Fix Schema Error", error);
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
        logger.info(`[DryRun] ${msg} `);
        trace.push(msg);
    };

    try {
        log("Starting Dry Run...");
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || 1;
        log(`User Context: ID ${userId} `);

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
        log(`Step 2: Integration Found(${activeInt.name})`);

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
            log(`Step 5 FAILED: DB Write Error - ${dbErr.message} `);
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
        log(`FATAL ERROR: ${error.message} `);
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
const staticPath = process.cwd();
const distPath = path.join(staticPath, 'dist');

if (fs.existsSync(distPath)) {
    logger.info(`Serving static files from ${distPath}`);
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
    logger.warn(`Static files not found at ${distPath}`);
    app.get('/', (req, res) => res.send('API Server Running (Static files not found)'));
}

// Start server immediately
const server = app.listen(Number(PORT), '0.0.0.0', async () => {
    logger.info(`API Server Started on port ${PORT}`);


    // Self-healing schema checks removed per Audit Remediation (Use migrations instead)
});

// Run migrations in background
runMigrations().catch(err => logger.error('Migration failed', err));
