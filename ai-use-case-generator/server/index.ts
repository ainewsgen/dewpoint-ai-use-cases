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
import { logger } from './utils/logger.js';
import { requireAuth, requireAdmin, AuthRequest } from './middleware/auth.js'; // Import Auth Middleware
import authRoutes from './routes/auth.js';
import authEnhancedRoutes from './routes/auth-enhanced.js';
import leadsRoutes from './routes/leads.js';
import cmsRoutes from './routes/cms.js';
import usersRoutes from './routes/users.js';
import integrationsRoutes from './routes/integrations.js';
import scanRoutes from './routes/scan.js';
import generateRoutes from './routes/generate.js';
import usageRoutes from './routes/usage.js';
import { runMigrations } from './db/migrate.js';
import { sql } from 'drizzle-orm';
import { db } from './db/index.js';
import * as schema from './db/schema.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ... middlewares ...

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.CLIENT_URL || 'https://dewpoint-strategy-app.onrender.com')
        : 'http://localhost:5173',
    credentials: true, // Allow cookies
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Rate Limiting (Audit Remediation)
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
// Apply to all API routes
app.use('/api', limiter);





// Secure Headers (Audit Remediation)
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "connect-src 'self' https:; " +
        "frame-ancestors 'none';"
    );
    next();
});

// Custom Middleware
import { shadowTracking } from './middleware/shadow.js';
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





import icpsRoutes from './routes/icps.js';
import libraryRoutes from './routes/library.js';
import syncLibraryRoutes from './routes/sync-library.js';
import { adminIcpsRouter } from './routes/admin-icps.js'; // Fixed Import

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

import systemPromptRoutes from './routes/system-prompt.js';
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
import { integrations } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from './utils/encryption.js';
import { OpenAIService } from './services/openai.js';
import { GeminiService } from './services/gemini.js';
import { UsageService } from './services/usage.js';



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
