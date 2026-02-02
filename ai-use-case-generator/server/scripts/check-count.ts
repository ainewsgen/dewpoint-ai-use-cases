
import { db } from '../db';
import { industryIcps } from '../db/schema';
import { count } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function checkCount() {
    try {
        const result = await db.select({ count: count() }).from(industryIcps);
        console.log(`\nTotal Industry ICPs: ${result[0].count}\n`);
        process.exit(0);
    } catch (error) {
        console.error('Error counting ICPs:', error);
        process.exit(1);
    }
}

checkCount();
