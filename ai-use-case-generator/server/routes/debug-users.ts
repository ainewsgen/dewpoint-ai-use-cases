
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

router.get('/debug-tables', async (req, res) => {
    try {
        console.log("🔍 Inspecting Tables...");

        // List Tables
        const tables = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        // Describe Leads
        const leadsCols = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads'
        `);

        // Describe Companies
        const companiesCols = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'companies'
        `);

        res.json({
            tables: tables.rows,
            leads_columns: leadsCols.rows,
            companies_columns: companiesCols.rows
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/force-repair', async (req, res) => {
    try {
        const trace = [];
        const run = async (q: any) => {
            try {
                await db.execute(q);
                trace.push(`SUCCESS: ${q.toString().substring(0, 50)}...`);
            } catch (e: any) {
                trace.push(`FAIL: ${e.message}`);
            }
        };

        // 1. Companies
        await run(sql`CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, user_id INTEGER, url TEXT, industry TEXT, naics_code TEXT, role TEXT, size TEXT, pain_point TEXT, stack JSONB, created_at TIMESTAMP DEFAULT NOW())`);

        // 2. Leads Columns
        await run(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id INTEGER`);
        await run(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS recipes JSONB DEFAULT '[]'::jsonb`);
        await run(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS shadow_id TEXT`);
        await run(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT`);

        // 3. Companies Columns (just in case)
        await run(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS naics_code TEXT`);

        res.json({ trace });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
