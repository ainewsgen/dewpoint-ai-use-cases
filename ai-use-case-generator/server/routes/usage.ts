import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { UsageService } from '../services/usage';
import { db } from '../db';
import { integrations } from '../db/schema';
import { eq, sql, desc } from 'drizzle-orm';

const router = Router();

// Get Daily Usage Stats
router.get('/usage/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = await UsageService.getDailyStats();
        res.json(stats);
    } catch (error) {
        console.error('Usage Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch usage stats' });
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

        // 1. Fetch ALL enabled integrations
        const allIntegrations = await db.query.integrations.findMany({
            where: eq(integrations.enabled, true),
            orderBy: (integrations, { desc }) => [desc(integrations.id)]
        });

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

export default router;
