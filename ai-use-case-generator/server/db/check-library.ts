
import { db } from './index.js';
import { useCaseLibrary } from './schema.js';

async function checkLibrary() {
    try {
        const all = await db.select().from(useCaseLibrary);
        console.log(`Total use cases: ${all.length}`);
        console.log('Use cases:', JSON.stringify(all, null, 2));
    } catch (error) {
        console.error('Error checking library:', error);
    } finally {
        process.exit(0);
    }
}

checkLibrary();
