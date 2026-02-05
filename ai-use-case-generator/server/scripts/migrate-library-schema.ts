
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('Migrating use_case_library table...');
    try {
        await db.execute(sql`
            ALTER TABLE use_case_library 
            ADD COLUMN IF NOT EXISTS data JSONB,
            ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
        `);
        console.log('Migration successful: Added data and is_published columns.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
