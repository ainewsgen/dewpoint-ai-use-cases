
import 'dotenv/config';
import { db } from '../db/index.js';
import { useCaseLibrary } from '../db/schema.js';
import { desc } from 'drizzle-orm';

async function listLibrary() {
    const items = await db.select().from(useCaseLibrary).orderBy(desc(useCaseLibrary.id));
    console.log(`Found ${items.length} items.`);
    items.forEach(item => {
        console.log(`[${item.id}] ${item.title} (Published: ${item.isPublished}) - Industry: ${item.industry}`);
    });
    process.exit(0);
}

listLibrary();
