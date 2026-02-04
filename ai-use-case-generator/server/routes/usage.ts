import { Router } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { UsageService } from '../services/usage.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as schema from '../db/schema.js';
const { users, integrations } = schema;

const router = Router();

// Get Usage Breakdown By User
router.get('/admin/usage/by-user', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Aggregate spend and request count per user
        const userStats = await db.select({
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            totalSpend: sql<number>`CAST(SUM(total_cost) AS DOUBLE PRECISION)`,
            requestCount: sql<number>`COUNT(*)`
        })
            .from(schema.apiUsage)
            .leftJoin(users, eq(schema.apiUsage.userId, users.id))
            .groupBy(users.id, users.name, users.email)
            .orderBy(desc(sql`total_spend`));

        res.json({ users: userStats });
    } catch (error: any) {
        console.error('User Usage Error:', error);
        res.status(500).json({ error: 'Failed to fetch user usage stats' });
    }
});

// Update Daily Limit (via OpenAI Integration Metadata)
router.put('/usage/limit', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { limit } = req.body;
        const newLimit = parseFloat(limit);

        if (isNaN(newLimit) || newLimit < 0) {
            return res.status(400).json({ error: 'Invalid limit value' });
        }

        // 1. Fetch ALL enabled integrations using db.select
        const allIntegrations = await db.select().from(integrations)
            .where(eq(integrations.enabled, true))
            .orderBy(desc(integrations.id));

        // 2. Find best match
        const openAIInt = allIntegrations.find(i => i.name === 'OpenAI')
            || allIntegrations.find(i => (i.metadata as any)?.provider === 'openai')
            || allIntegrations[0];

        if (!openAIInt) {
            console.warn("Update Limit: No active integration found");
            return res.status(404).json({ error: 'No active integration found. Please connect an AI provider.' });
        }

        // Update Metadata
        const currentMeta = (openAIInt.metadata as any) || {};
        const newMeta = { ...currentMeta, daily_limit_usd: newLimit };

        await db.update(integrations)
            .set({ metadata: newMeta })
            .where(eq(integrations.id, openAIInt.id));

        console.log(`[Admin] Updated Daily Limit to $${newLimit} for Integration ID ${openAIInt.id}`);

        res.json({ success: true, limit: newLimit });

    } catch (error) {
        console.error('Update Limit Error:', error);
        res.status(500).json({ error: 'Failed to update limit' });
    }
});

import { decrypt } from '../utils/encryption.js';
import { OpenAIService } from '../services/openai.js';

// ... existing code ...

// System Readiness Check (Deep Diagnostic)
router.post('/usage/readiness-check', requireAuth, requireAdmin, async (req, res) => {
    try {
        const report = {
            integration: { status: 'pending', details: '' },
            budget: { status: 'pending', details: '' },
            api_connection: { status: 'pending', details: '' },
            overall: false
        };

        // 1. Check Integration (Global Scope)
        const allIntegrations = await db.select().from(integrations)
            .where(eq(integrations.enabled, true));

        const activeInt = allIntegrations.find(i => i.enabled && (i.apiKey || i.apiSecret));

        if (!activeInt) {
            report.integration = { status: 'failed', details: 'No enabled integration with API Request keys found.' };
            return res.json(report);
        }
        report.integration = { status: 'ok', details: `Found active provider: ${activeInt.name}` };

        // 2. Check Budget
        const stats = await UsageService.getDailyStats();
        if (stats.spend >= stats.limit) {
            report.budget = { status: 'failed', details: `Budget exceeded ($${stats.spend.toFixed(2)} / $${stats.limit.toFixed(2)})` };
            // We return here because budget block prevents API call
            return res.json(report);
        }
        report.budget = { status: 'ok', details: `Budget healthy ($${stats.spend.toFixed(2)} / $${stats.limit.toFixed(2)})` };

        // 3. Live API Test
        try {
            const apiKey = activeInt.apiKey ? decrypt(activeInt.apiKey) : '';
            if (!apiKey) throw new Error("API Key empty after decryption");

            await OpenAIService.generateJSON({
                apiKey,
                systemPrompt: "You are a connectivity test. Return valid JSON.",
                userContext: "Return a JSON object: { \"status\": \"ok\" }",
                model: "gpt-3.5-turbo"
            });
            report.api_connection = { status: 'ok', details: 'Live API connection successful' };
            report.overall = true;
        } catch (apiErr: any) {
            report.api_connection = { status: 'failed', details: `API Handshake failed: ${apiErr.message}` };
        }

        res.json(report);

    } catch (error: any) {
        console.error('Readiness Check Error:', error);
        res.status(500).json({ error: 'System Check Failed', details: error.message });
    }
});

// Readiness Check (Already implemented)

export default router;
