
import 'dotenv/config';
import { db } from '../db';
import { leads, useCaseLibrary, companies, industryIcps } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
    console.log("🔄 Starting Library Sync...");

    // 1. Fetch all leads with recipes
    const allLeads = await db.select({
        recipes: leads.recipes,
        companyIndustry: companies.industry,
        userIndustry: companies.industry // Fallback
    })
        .from(leads)
        .leftJoin(companies, eq(leads.companyId, companies.id));

    console.log(`Found ${allLeads.length} leads to process.`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const lead of allLeads) {
        // Safe parsing of recipes
        let recipes: any[] = [];
        if (Array.isArray(lead.recipes)) {
            recipes = lead.recipes;
        } else if (typeof lead.recipes === 'string') {
            try { recipes = JSON.parse(lead.recipes); } catch (e) { }
        }

        const industry = lead.companyIndustry || "General";

        for (const recipe of recipes) {
            // Map fields to Library Schema
            // Schema: industry, title, description, roiEstimate, difficulty, tags
            const title = recipe.title || "Untitled Use Case";
            const description = recipe.solution_narrative || recipe.solutionNarrative || recipe.description || "No description provided.";
            const roi = recipe.roi_estimate || recipe.roiEstimate || recipe.kpi_impact || "N/A";
            const difficulty = recipe.difficulty || "Med";

            // Build Tags
            const tags = [];
            if (recipe.department) tags.push(recipe.department);
            if (recipe.tech_stack) tags.push(...(Array.isArray(recipe.tech_stack) ? recipe.tech_stack : [recipe.tech_stack]));
            if (recipe.icp_persona) tags.push(recipe.icp_persona);

            // Check existence (Deduplication)
            const existing = await db.select().from(useCaseLibrary)
                .where(sql`${useCaseLibrary.title} = ${title} AND ${useCaseLibrary.industry} = ${industry}`)
                .limit(1);

            if (existing.length === 0) {
                await db.insert(useCaseLibrary).values({
                    industry,
                    title,
                    description,
                    roiEstimate: roi,
                    difficulty,
                    tags
                });
                addedCount++;
                process.stdout.write('+');
            } else {
                skippedCount++;
                process.stdout.write('.');
            }
        }
    }

    console.log(`\n\n✅ Sync Complete.`);
    console.log(`   Added: ${addedCount}`);
    console.log(`   Skipped (Duplicate): ${skippedCount}`);
    process.exit(0);
}

main();
