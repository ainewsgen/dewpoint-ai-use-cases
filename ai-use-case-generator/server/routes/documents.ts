import { Router } from 'express';
import { db } from '../db/index.js';
import { documents } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { GeminiService } from '../services/gemini.js';

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
    } catch (error: any) {
        console.error("Fetch documents error:", error);
        res.status(500).json({ error: "Failed to fetch documents", details: error.message });
    }
});

// GET /api/admin/documents (Admin Management)
router.get('/admin/documents', requireAuth, requireAdmin, async (req, res) => {
    try {
        const results = await db.select()
            .from(documents)
            .orderBy(desc(documents.createdAt));
        res.json({ success: true, documents: results });
    } catch (error: any) {
        console.error("Fetch admin documents error:", error);
        res.status(500).json({ error: "Failed to fetch admin documents", details: error.message });
    }
});

// POST /api/admin/documents (Upload)
router.post('/admin/documents', requireAuth, requireAdmin, async (req, res) => {
    try {
        let { name, type, content, fileName, fileType, description } = req.body;

        if (!name || !type || !content) {
            return res.status(400).json({ error: "Name, type, and content are required" });
        }

        // Auto-generate description if missing
        if (!description) {
            try {
                description = await GeminiService.generateDocumentDescription(name, type, fileName || "");
            } catch (err) {
                console.error("AI Description failed, skipping...", err);
            }
        }

        const newDoc = await db.insert(documents).values({
            name,
            type,
            content,
            fileName,
            fileType,
            description,
            isPublished: false
        }).returning();

        res.json({ success: true, document: newDoc[0] });
    } catch (error: any) {
        console.error("Create document error:", error);
        res.status(500).json({ error: "Failed to create document", details: error.message });
    }
});

// POST /api/documents/:id/download (Track Analytics)
router.post('/documents/:id/download', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.execute(
            `UPDATE documents SET download_count = download_count + 1 WHERE id = ${parseInt(id as string)} RETURNING id`
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Document not found" });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error("Track download error:", error);
        res.status(500).json({ error: "Failed to track download", details: error.message });
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
    } catch (error: any) {
        console.error("Update document error:", error);
        res.status(500).json({ error: "Failed to update document", details: error.message });
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
    } catch (error: any) {
        console.error("Delete document error:", error);
        res.status(500).json({ error: "Failed to delete document", details: error.message });
    }
});

export default router;
