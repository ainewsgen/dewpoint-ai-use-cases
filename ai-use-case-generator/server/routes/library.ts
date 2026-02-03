import { Router } from 'express';
import { db } from '../db';
import { useCaseLibrary } from '../db/schema';
import { eq, ilike } from 'drizzle-orm';
import { requireAdmin, requireAuth } from '../middleware/auth';

const router = Router();

// Public: Get Library (filtered by industry?)
router.get('/library', async (req, res) => {
    try {
        const { industry } = req.query;
        let query = db.select().from(useCaseLibrary);

        if (industry && typeof industry === 'string') {
            query = query.where(ilike(useCaseLibrary.industry, `%${industry}%`)) as any;
        }

        const cases = await query.orderBy(useCaseLibrary.industry);
        res.json({ useCases: cases });
    } catch (error: any) {
        console.error('Get library error:', error);
        res.status(500).json({ error: 'Failed to fetch library', details: error.message });
    }
});

// Admin: Create Use Case
router.post('/admin/library', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { industry, title, description, roiEstimate, difficulty, tags } = req.body;

        if (!industry || !title || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }


        const newCase = await db.insert(useCaseLibrary).values({
            industry,
            title,
            description,
            roiEstimate: roiEstimate || "N/A",
            difficulty: difficulty || "Med",
            tags: tags || [],
            data: req.body.data || null,
            isPublished: req.body.isPublished || false
        }).returning();

        res.json({ useCase: newCase[0] });
    } catch (error) {
        console.error('Create use case error:', error);
        res.status(500).json({ error: 'Failed to create use case' });
    }
});

// Admin: Update Use Case
router.put('/admin/library/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { industry, title, description, roiEstimate, difficulty, tags, data, isPublished } = req.body;

        const updatedCase = await db.update(useCaseLibrary)
            .set({
                industry,
                title,
                description,
                roiEstimate,
                difficulty,
                tags,
                data,
                isPublished
            })
            .where(eq(useCaseLibrary.id, parseInt(id as string)))
            .returning();

        res.json({ useCase: updatedCase[0] });
    } catch (error) {
        console.error('Update use case error:', error);
        res.status(500).json({ error: 'Failed to update use case' });
    }
});

// Admin: Delete Use Case
router.delete('/admin/library/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.delete(useCaseLibrary).where(eq(useCaseLibrary.id, parseInt(id as string)));
        res.json({ success: true });
    } catch (error) {
        console.error('Delete use case error:', error);
        res.status(500).json({ error: 'Failed to delete use case' });
    }
});

export default router;
