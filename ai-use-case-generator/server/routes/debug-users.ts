
import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { sql } from 'drizzle-orm';

const router = Router();

// Public diagnostic to inspect DB state without auth (temporarily)
router.get('/debug-users-dump', async (req, res) => {
    try {
        console.log("🔍 Dumping Users Table...");

        // 1. Raw SQL Dump (Bypassing Drizzle filters if any)
        const rawResult = await db.execute(sql`SELECT * FROM users`);

        res.json({
            count: rawResult.rows.length,
            rows: rawResult.rows
        });
    } catch (error: any) {
        console.error("Dump failed:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
