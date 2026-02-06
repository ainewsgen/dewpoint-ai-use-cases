import { db } from '../db/index.js';
import { useCaseLibrary } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

const mapping = {
    "AI Meeting Assistant": "Operational Transparency Scribe",
    "Automated Invoice Processing": "Margin Preservation Agent",
    "Customer Support Triaging": "Brand Sentiment Sentinel",
    "Social Media Content Repurposing": "Content Asset Multiplier",
    "Lead Scoring & Enrichment": "Conversion Acceleration Scout",
    "Employee Onboarding Bot": "Human Capital Optimization Agent",
    "Competitor Price Watch": "Strategic Agility Monitor",
    "Legal Contract Review": "Intellectual Property Monetizer",
    "Inventory Demand Forecasting": "Logistics Fidelity Guard",
    "Personalized Email Outreach": "High-Value Prospect Catalyst"
};

async function updateTaxonomy() {
    console.log("Updating database taxonomy...");
    for (const [oldTitle, newTitle] of Object.entries(mapping)) {
        const result = await db.update(useCaseLibrary)
            .set({ title: newTitle })
            .where(eq(useCaseLibrary.title, oldTitle))
            .returning();

        if (result.length > 0) {
            console.log(`✅ Updated: "${oldTitle}" -> "${newTitle}"`);
        }
    }
    console.log("Done!");
    process.exit(0);
}

updateTaxonomy().catch(console.error);
