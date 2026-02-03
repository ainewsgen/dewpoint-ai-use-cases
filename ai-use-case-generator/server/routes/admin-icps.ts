
import { Router } from 'express';
import { db } from '../db';
import { industryIcps, integrations } from '../db/schema';
import { eq, ilike, desc, sql } from 'drizzle-orm';
import { OpenAIService } from '../services/openai';
import { decrypt } from '../utils/encryption';

const router = Router();

// Helper to get OpenAI Key
async function getOpenAIKey() {
    if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    const allEnabled = await db.query.integrations.findMany({ where: (t, { eq }) => eq(t.enabled, true) });
    let integration = allEnabled.find(i => i.name?.toLowerCase().includes('openai')) || allEnabled[0];
    if (integration?.apiKey) return decrypt(integration.apiKey);
    throw new Error(`No usable API Key found.`);
}

// GET /api/admin/icps - List all
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = db.select().from(industryIcps);

        if (search) {
            // @ts-ignore
            query = query.where(ilike(industryIcps.industry, `%${search}%`));
        }

        const stats = await query.orderBy(desc(industryIcps.overallAttractiveness));
        res.json(stats);
    } catch (error: any) {
        console.error('Error fetching ICPs:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/icps/:id - Detail
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const icp = await db.query.industryIcps.findFirst({
            where: eq(industryIcps.id, parseInt(id))
        });

        if (!icp) return res.status(404).json({ error: 'ICP not found' });
        res.json(icp);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/icps/:id - Update
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove ID from updates to avoid PK conflict
        delete updates.id;
        delete updates.createdAt;

        await db.update(industryIcps)
            .set(updates)
            .where(eq(industryIcps.id, parseInt(id)));

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error updating ICP:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/icps/:id/regenerate - Re-run AI
router.post('/:id/regenerate', async (req, res) => {
    try {
        const { id } = req.params;
        const icpModel = await db.query.industryIcps.findFirst({
            where: eq(industryIcps.id, parseInt(id))
        });

        if (!icpModel) return res.status(404).json({ error: 'ICP not found' });

        const apiKey = await getOpenAIKey();

        // Re-use logic from seed-icps.ts but for single item
        // Determine type (B2B vs B2C) based on icpType
        let newData;
        if (icpModel.icpType === 'dewpoint') {
            // B2B Logic
            const systemPrompt = `You are a GTM Strategist for DewPoint.
            Target: Business Owner in ${icpModel.industry}.
            Return JSON matching the schema for: icpPersona, primaryPainCategory, regulatoryRequirements, techSignals, communities, profitScore, ltvScore, speedToCloseScore, gtmPrimary, promptInstructions, negativeIcps, discoveryGuidance.`;

            newData = await OpenAIService.generateJSON({
                systemPrompt,
                userContext: `Industry: ${icpModel.industry} (NAICS: ${icpModel.naicsCode})`,
                apiKey,
                model: 'gpt-4o'
            });
            // Map back to DB fields (simplified for this snippet)
            if (newData) {
                // Ensure we map standard fields + new fields
                await db.update(industryIcps).set({
                    icpPersona: newData.icpPersona,
                    promptInstructions: newData.promptInstructions,
                    // Try to update scores if present
                    profitScore: newData.profitScore,
                    ltvScore: newData.ltvScore,
                    speedToCloseScore: newData.speedToCloseScore,
                    // Update JSON fields
                    communities: newData.communities,
                    techSignals: newData.techSignals,
                    regulatoryRequirements: newData.regulatoryRequirements,
                    negativeIcps: newData.negativeIcps,
                    discoveryGuidance: newData.discoveryGuidance,
                }).where(eq(industryIcps.id, parseInt(id)));
            }

        } else {
            // B2C Logic (Internal)
            const systemPrompt = `You are a Marketing Strategist.
            Target: End Customer for ${icpModel.industry}.
            Return JSON matching schema for: icpPersona, searchQueries, keywords, economicDrivers, profitScore, ltvScore.`;

            newData = await OpenAIService.generateJSON({
                systemPrompt,
                userContext: `Industry: ${icpModel.industry}`,
                apiKey,
                model: 'gpt-4o'
            });

            if (newData) {
                await db.update(industryIcps).set({
                    icpPersona: newData.icpPersona,
                    promptInstructions: newData.promptInstructions,
                    profitScore: newData.profitScore,
                    ltvScore: newData.ltvScore,
                    searchQueries: newData.searchQueries,
                    keywords: newData.keywords,
                    economicDrivers: newData.economicDrivers,
                    negativeIcps: newData.negativeIcps,
                }).where(eq(industryIcps.id, parseInt(id)));
            }
        }

        res.json({ success: true, data: newData });

    } catch (error: any) {
        console.error('Error regenerating ICP:', error);
        res.status(500).json({ error: error.message });
    }
});


export const adminIcpsRouter = router;
