import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { UsageService } from '../services/usage';
import { db } from '../db';
import { integrations } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

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

        // Find OpenAI Integration (Get latest created if multiple)
        const openAIIntegrations = await db.query.integrations.findMany({
            where: eq(integrations.name, 'OpenAI'),
            orderBy: (integrations, { desc }) => [desc(integrations.id)],
            limit: 1
        });
        const openAIInt = openAIIntegrations[0];

        if (!openAIInt) {
            console.warn("Update Limit: OpenAI integration not found");
            return res.status(404).json({ error: 'OpenAI integration not found. Please connect it first.' });
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
