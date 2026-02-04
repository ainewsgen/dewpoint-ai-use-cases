
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    console.log("Running Schema v2 Migrations...");
    try {
        await db.execute(sql`
            ALTER TABLE industry_icps 
            ADD COLUMN IF NOT EXISTS communities jsonb,
            ADD COLUMN IF NOT EXISTS search_queries jsonb,
            ADD COLUMN IF NOT EXISTS linkedin_angles jsonb,
            ADD COLUMN IF NOT EXISTS tech_signals text[],
            ADD COLUMN IF NOT EXISTS keywords jsonb,
            ADD COLUMN IF NOT EXISTS regulatory_requirements text,
            ADD COLUMN IF NOT EXISTS region_specificity text[],
            ADD COLUMN IF NOT EXISTS buyer_titles text[];
        `);
        console.log("✅ Schema v2 columns added successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
