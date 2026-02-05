
import { db } from '../db/index.js';
import { leads, users, companies } from '../db/schema.js';
import { sql } from 'drizzle-orm';

async function checkLeads() {
    try {
        console.log("Checking Leads Table...");
        // @ts-ignore
        const leadCount = await db.select({ count: sql<number>`count(*)` }).from(leads);
        console.log("Total Leads:", leadCount[0]);

        const allLeads = await db.select().from(leads).limit(5);
        console.log("First 5 Leads:", JSON.stringify(allLeads, null, 2));

        console.log("Checking Users Table...");
        // @ts-ignore
        const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
        console.log("Total Users:", userCount[0]);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkLeads();
