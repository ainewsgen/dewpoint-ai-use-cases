
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

router.get('/debug-companies-dump', async (req, res) => {
    try {
        console.log("🔍 Dumping Companies...");
        const result = await db.execute(sql`SELECT * FROM companies`);
        res.json({
            count: result.rows.length,
            rows: result.rows
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message, stack: error.stack });
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

        // 0. Define Enums FIRST (Required for table creation)
        const enums = [
            `CREATE TYPE dewpoint_icp_type AS ENUM ('dewpoint', 'internal')`,
            `CREATE TYPE dewpoint_gtm_motion AS ENUM ('outbound', 'content', 'community', 'partner')`,
            `CREATE TYPE dewpoint_pain_category AS ENUM ('revenue_leakage', 'capacity_constraint', 'cost_overrun', 'compliance_risk', 'customer_experience', 'data_fragmentation')`,
            `CREATE TYPE dewpoint_time_to_value AS ENUM ('<30_days', '30_60_days', '60_90_days', 'gt_90_days')`,
            `CREATE TYPE dewpoint_buying_complexity AS ENUM ('single_decision_maker', 'dual_approval', 'committee_light', 'committee_heavy')`,
            `CREATE TYPE dewpoint_budget_ownership AS ENUM ('owner_discretionary', 'departmental', 'centralized_procurement')`,
            `CREATE TYPE dewpoint_content_resonance AS ENUM ('operator_story', 'peer_case_study', 'data_benchmark', 'contrarian_insight')`,
            `CREATE TYPE dewpoint_readiness AS ENUM ('low', 'medium', 'high')`,
            `CREATE TYPE dewpoint_tolerance AS ENUM ('low', 'medium', 'high')`,
            `CREATE TYPE dewpoint_reference_value AS ENUM ('low', 'medium', 'high')`,
            `CREATE TYPE dewpoint_expansion_potential AS ENUM ('workflow_only', 'multi_workflow', 'platform_candidate')`
        ];

        for (const enumSql of enums) {
            await run(sql.raw(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumSql.split(' ')[2]}') THEN ${enumSql}; END IF; END $$;`));
        }

        // 1. Companies
        await run(sql.raw(`CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, user_id INTEGER, url TEXT, industry TEXT, naics_code TEXT, role TEXT, size TEXT, pain_point TEXT, stack JSONB, created_at TIMESTAMP DEFAULT NOW())`));

        // 2. Leads Columns
        await run(sql.raw(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id INTEGER`));
        await run(sql.raw(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS recipes JSONB DEFAULT '[]'::jsonb`));
        await run(sql.raw(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS shadow_id TEXT`));
        await run(sql.raw(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT`));

        // 3. Companies Columns (just in case)
        await run(sql.raw(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS naics_code TEXT`));

        // 3.5 Create Industry ICPs Table (If missing)
        await run(sql.raw(`CREATE TABLE IF NOT EXISTS industry_icps (
            id SERIAL PRIMARY KEY,
            industry TEXT NOT NULL,
            perspective TEXT DEFAULT 'Business Owner' NOT NULL,
            naics_code TEXT,
            icp_persona TEXT NOT NULL,
            prompt_instructions TEXT NOT NULL,
            negative_icps TEXT,
            discovery_guidance TEXT,
            economic_drivers TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`));

        // 4. ICP Migration (Perspectives) - logic works on existing table
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS perspective TEXT DEFAULT 'Business Owner' NOT NULL`));

        // Drop old unique constraint on industry (if it exists)
        await run(sql.raw(`ALTER TABLE industry_icps DROP CONSTRAINT IF EXISTS industry_icps_industry_unique`));
        await run(sql.raw(`ALTER TABLE industry_icps DROP CONSTRAINT IF EXISTS industry_icps_industry_key`));

        // Create new unique index (composite)
        await run(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS industry_perspective_idx ON industry_icps (industry, perspective)`));

        // 5. DewPoint GTM Columns (Enums already created)
        // Add Columns
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS icp_type dewpoint_icp_type DEFAULT 'dewpoint'`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS target_company_description TEXT`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS employee_min INTEGER`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS employee_max INTEGER`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS revenue_min_usd NUMERIC(20,0)`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS revenue_max_usd NUMERIC(20,0)`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS ownership_model TEXT`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS buyer_titles TEXT[]`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS primary_region TEXT[]`));

        // Scoring
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS profit_score INTEGER`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS ltv_score INTEGER`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS speed_to_close_score INTEGER`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS overall_attractiveness NUMERIC(4,2)`));

        // GTM
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS gtm_primary dewpoint_gtm_motion`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS gtm_secondary dewpoint_gtm_motion`));

        // Pain
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS primary_pain_category dewpoint_pain_category`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS time_to_value dewpoint_time_to_value`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS buying_complexity dewpoint_buying_complexity`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS budget_ownership dewpoint_budget_ownership`));

        // Marketing
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS content_resonance_type dewpoint_content_resonance`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS objection_profile TEXT[]`));

        // Delivery
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS operational_readiness dewpoint_readiness`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS change_tolerance dewpoint_tolerance`));

        // Portfolio
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS reference_value dewpoint_reference_value`));
        await run(sql.raw(`ALTER TABLE industry_icps ADD COLUMN IF NOT EXISTS expansion_potential dewpoint_expansion_potential`));

        res.json({ trace });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
