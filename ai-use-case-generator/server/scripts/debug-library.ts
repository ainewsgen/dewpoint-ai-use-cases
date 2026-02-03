
import 'dotenv/config';
import { db } from '../db';
import { useCaseLibrary } from '../db/schema';
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
