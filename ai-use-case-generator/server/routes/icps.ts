import { Router } from 'express';
import { db } from '../db/index.js';
import { industryIcps } from '../db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

// Public: Get List of Industries (for autocomplete)
router.get('/icps/industries', async (req, res) => {
    try {
        const industries = await db.select({
            industry: industryIcps.industry
        }).from(industryIcps);
        res.json({ industries: industries.map(i => i.industry) });
    } catch (error) {
        console.error('Get industries error:', error);
        res.status(500).json({ error: 'Failed to fetch industries' });
    }
});

// Admin: Get All ICPs
router.get('/admin/icps', requireAuth, requireAdmin, async (req, res) => {
    try {
        const allIcps = await db.select().from(industryIcps).orderBy(industryIcps.industry);
        res.json({ icps: allIcps });
    } catch (error) {
        console.error('Get all ICPs error:', error);
        res.status(500).json({ error: 'Failed to fetch ICPs' });
    }
});

// Admin: Create ICP
router.post('/admin/icps', requireAuth, requireAdmin, async (req, res) => {
    try {
        const {
            industry, icpType, naicsCode, icpPersona, promptInstructions,
            negativeIcps, discoveryGuidance, economicDrivers,
            // DewPoint GTM Fields
            profitScore, ltvScore, speedToCloseScore, satisfactionScore,
            gtmPrimary, primaryPainCategory
        } = req.body;

        if (!industry || !icpPersona || !promptInstructions) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Map icpType to legacy perspective for DB constraint compatibility
        const perspectiveVal = (icpType === 'internal') ? 'Sales Target' : 'Business Owner';

        const newIcp = await db.insert(industryIcps).values({
            industry,
            icpType: icpType || 'dewpoint',
            perspective: perspectiveVal, // Maintain legacy column
            naicsCode: naicsCode || null,
            icpPersona,
            promptInstructions,
            negativeIcps: negativeIcps || null,
            discoveryGuidance: discoveryGuidance || null,
            economicDrivers: economicDrivers || null,

            // New Fields
            profitScore: profitScore || null,
            ltvScore: ltvScore || null,
            speedToCloseScore: speedToCloseScore || null,
            satisfactionScore: satisfactionScore || null,
            gtmPrimary: gtmPrimary || null,
            primaryPainCategory: primaryPainCategory || null
        }).returning();

        res.json({ icp: newIcp[0] });
    } catch (error: any) {
        console.error('Create ICP error:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ error: 'ICP variant already exists' });
        }
        res.status(500).json({ error: 'Failed to create ICP' });
    }
});

// Admin: Update ICP
router.put('/admin/icps/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            industry, icpType, naicsCode, icpPersona, promptInstructions,
            negativeIcps, discoveryGuidance, economicDrivers,
            // DewPoint GTM Fields
            profitScore, ltvScore, speedToCloseScore, satisfactionScore,
            gtmPrimary, primaryPainCategory
        } = req.body;

        // Map icpType to legacy perspective
        const perspectiveVal = (icpType === 'internal') ? 'Sales Target' : 'Business Owner';

        const updatedIcp = await db.update(industryIcps)
            .set({
                industry,
                icpType: icpType || 'dewpoint',
                perspective: perspectiveVal,
                naicsCode: naicsCode || null,
                icpPersona,
                promptInstructions,
                negativeIcps: negativeIcps || null,
                discoveryGuidance: discoveryGuidance || null,
                economicDrivers: economicDrivers || null,

                // New Fields
                profitScore: profitScore || null,
                ltvScore: ltvScore || null,
                speedToCloseScore: speedToCloseScore || null,
                satisfactionScore: satisfactionScore || null,
                gtmPrimary: gtmPrimary || null,
                primaryPainCategory: primaryPainCategory || null
            })
            .where(eq(industryIcps.id, parseInt(id as string)))
            .returning();

        if (updatedIcp.length === 0) {
            return res.status(404).json({ error: 'ICP not found' });
        }

        res.json({ icp: updatedIcp[0] });
    } catch (error) {
        console.error('Update ICP error:', error);
        res.status(500).json({ error: 'Failed to update ICP' });
    }
});

// Admin: Delete ICP
router.delete('/admin/icps/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.delete(industryIcps).where(eq(industryIcps.id, parseInt(id as string)));
        res.json({ success: true });
    } catch (error) {
        console.error('Delete ICP error:', error);
        res.status(500).json({ error: 'Failed to delete ICP' });
    }
});

export default router;
