
import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Running manual migration...");
    try {
        await db.execute(sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;`);
        console.log("✅ Successfully added 'priority' column.");
    } catch (e: any) {
        console.error("❌ Error adding column:", e.message);
    }
    process.exit(0);
}

main();
