import { db } from './server/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log("Checking api_usage table...");
        await db.execute(sql`ALTER TABLE api_usage ADD COLUMN IF NOT EXISTS integration_id INTEGER REFERENCES integrations(id);`);
        console.log("Migration successful: integration_id column added to api_usage.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
