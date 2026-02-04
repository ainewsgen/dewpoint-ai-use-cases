import { Router } from 'express';
import { db } from '../db/index.js';
import { useCaseLibrary } from '../db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

// Public: Get Library (filtered by industry?)
router.get('/library', async (req, res) => {
    try {
        const { industry } = req.query;
        let query = db.select().from(useCaseLibrary);

        if (industry && typeof industry === 'string') {
            query = query.where(ilike(useCaseLibrary.industry, `%${industry}%`)) as any;
        }

        // Only show published use cases in the public library
        query = query.where(eq(useCaseLibrary.isPublished, true)) as any;

        const cases = await query.orderBy(useCaseLibrary.industry);
        res.json({ useCases: cases });
    } catch (error: any) {
        console.error('Get library error:', error);
        res.status(500).json({ error: 'Failed to fetch library', details: error.message });
    }
});

// Admin: Get All Library Items (Publish status agnostic)
router.get('/admin/library/all', requireAuth, requireAdmin, async (req, res) => {
    try {
        const cases = await db.select().from(useCaseLibrary).orderBy(useCaseLibrary.industry);
        res.json({ useCases: cases });
    } catch (error: any) {
        console.error('Get all library items error:', error);
        res.status(500).json({ error: 'Failed to fetch all library items', details: error.message });
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

// Admin: Toggle Publish Status
router.patch('/admin/library/:id/toggle', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isPublished } = req.body;

        const updatedCase = await db.update(useCaseLibrary)
            .set({ isPublished })
            .where(eq(useCaseLibrary.id, parseInt(id as string)))
            .returning();

        res.json({ success: true, isPublished: updatedCase[0].isPublished });
    } catch (error: any) {
        console.error('Toggle publish error:', error);
        res.status(500).json({ error: 'Failed to toggle status', details: error.message });
    }
});

// Admin: Cleanup AI Generated Cards (heuristic: data is not null)
router.delete('/admin/library/cleanup/ai', requireAuth, requireAdmin, async (req, res) => {
    try {
        // We delete items where 'data' is NOT NULL, as they were likely synced/generated
        const result = await db.execute(sql`DELETE FROM use_case_library WHERE data IS NOT NULL`);
        res.json({ success: true, message: "AI-generated cards cleaned up" });
    } catch (error: any) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Failed to cleanup', details: error.message });
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

import { sql } from 'drizzle-orm';
export default router;
