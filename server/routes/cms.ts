import { Router } from 'express';
import { db } from '../db';
import { cmsContents, integrations } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Get CMS Content
router.get('/cms/:key', async (req, res) => {
    try {
        const { key } = req.params;

        const content = await db.select()
            .from(cmsContents)
            .where(eq(cmsContents.key, key))
            .limit(1);

        if (content.length === 0) {
            return res.json({ content: null });
        }

        // Only return published content to non-admin
        if (content[0].status !== 'published') {
            return res.json({ content: null });
        }

        res.json({ content: content[0] });
    } catch (error) {
        console.error('Get CMS content error:', error);
        res.status(500).json({ error: 'Failed to get content' });
    }
});

// Update CMS Content (Admin)
router.post('/admin/cms', async (req, res) => {
    try {
        const { key, value, status } = req.body;

        if (!key) {
            return res.status(400).json({ error: 'Key is required' });
        }

        // Check if content exists
        const existing = await db.select()
            .from(cmsContents)
            .where(eq(cmsContents.key, key))
            .limit(1);

        if (existing.length > 0) {
            // Update
            const updated = await db.update(cmsContents)
                .set({
                    value: value || null,
                    status: status || 'draft',
                    updatedAt: new Date()
                })
                .where(eq(cmsContents.key, key))
                .returning();

            res.json({ content: updated[0] });
        } else {
            // Insert
            const created = await db.insert(cmsContents)
                .values({ key, value: value || null, status: status || 'draft' })
                .returning();

            res.json({ content: created[0] });
        }
    } catch (error) {
        console.error('Update CMS content error:', error);
        res.status(500).json({ error: 'Failed to update content' });
    }
});

// Get All Integrations
router.get('/integrations', async (req, res) => {
    try {
        const allIntegrations = await db.select().from(integrations).where(eq(integrations.enabled, true));
        res.json({ integrations: allIntegrations });
    } catch (error) {
        console.error('Get integrations error:', error);
        res.status(500).json({ error: 'Failed to get integrations' });
    }
});

// Add Integration (Admin)
router.post('/admin/integrations', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const integration = await db.insert(integrations)
            .values({ name, enabled: true })
            .returning();

        res.json({ integration: integration[0] });
    } catch (error) {
        console.error('Add integration error:', error);
        res.status(500).json({ error: 'Failed to add integration' });
    }
});

// Delete Integration (Admin)
router.delete('/admin/integrations/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        await db.delete(integrations).where(eq(integrations.id, id));

        res.json({ success: true });
    } catch (error) {
        console.error('Delete integration error:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

export default router;
