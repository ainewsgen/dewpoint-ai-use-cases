import { Router } from 'express';
import { db } from '../db/index.js';
import { documents } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/documents (Public/User)
// Fetch only published documents
router.get('/documents', requireAuth, async (req, res) => {
    try {
        const results = await db.select()
            .from(documents)
            .where(eq(documents.isPublished, true))
            .orderBy(desc(documents.createdAt));

        // Return without the content payload if you want to optimize fetching lists, 
        // but for now, since users might download them directly, we can include it or create a separate detail route.
        // Let's include everything for simplicity in the MVP.
        res.json({ success: true, documents: results });
    } catch (error) {
        console.error("Fetch documents error:", error);
        res.status(500).json({ error: "Failed to fetch documents" });
    }
});

// GET /api/admin/documents (Admin Management)
router.get('/admin/documents', requireAuth, requireAdmin, async (req, res) => {
    try {
        const results = await db.select()
            .from(documents)
            .orderBy(desc(documents.createdAt));
        res.json({ success: true, documents: results });
    } catch (error) {
        console.error("Fetch admin documents error:", error);
        res.status(500).json({ error: "Failed to fetch admin documents" });
    }
});

// POST /api/admin/documents (Upload)
router.post('/admin/documents', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, type, content, fileName, fileType } = req.body;

        if (!name || !type || !content) {
            return res.status(400).json({ error: "Name, type, and content are required" });
        }

        const newDoc = await db.insert(documents).values({
            name,
            type,
            content,
            fileName,
            fileType,
            isPublished: false
        }).returning();

        res.json({ success: true, document: newDoc[0] });
    } catch (error) {
        console.error("Create document error:", error);
        res.status(500).json({ error: "Failed to create document" });
    }
});

// PATCH /api/admin/documents/:id (Update metadata or status)
router.patch('/admin/documents/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updated = await db.update(documents)
            .set(updates)
            .where(eq(documents.id, parseInt(id as string)))
            .returning();

        if (updated.length === 0) {
            return res.status(404).json({ error: "Document not found" });
        }

        res.json({ success: true, document: updated[0] });
    } catch (error) {
        console.error("Update document error:", error);
        res.status(500).json({ error: "Failed to update document" });
    }
});

// DELETE /api/admin/documents/:id
router.delete('/admin/documents/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await db.delete(documents)
            .where(eq(documents.id, parseInt(id as string)))
            .returning();

        if (deleted.length === 0) {
            return res.status(404).json({ error: "Document not found" });
        }

        res.json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
        console.error("Delete document error:", error);
        res.status(500).json({ error: "Failed to delete document" });
    }
});

export default router;
