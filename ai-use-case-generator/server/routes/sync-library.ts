
import { Router } from 'express';
import { db } from '../db/index.js';
import { leads, useCaseLibrary, companies } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/admin/library/sync', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log("🔄 Starting Library Sync (Endpoint)...");

        // 1. Fetch all leads with recipes
        const allLeads = await db.select({
            recipes: leads.recipes,
            companyIndustry: companies.industry,
        })
            .from(leads)
            .leftJoin(companies, eq(leads.companyId, companies.id));

        let addedCount = 0;
        let skippedCount = 0;

        for (const lead of allLeads) {
            // Safe parsing
            let recipes: any[] = [];
            if (Array.isArray(lead.recipes)) {
                recipes = lead.recipes;
            } else if (typeof lead.recipes === 'string') {
                try { recipes = JSON.parse(lead.recipes); } catch (e) { }
            }

            const industry = lead.companyIndustry || "General";

            for (const recipe of recipes) {
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
                // We use title + industry as a rough unique key
                const existing = await db.select().from(useCaseLibrary)
                    .where(sql`${useCaseLibrary.title} = ${title} AND ${useCaseLibrary.industry} = ${industry}`)
                    .limit(1);

                if (existing.length === 0) {
                    await db.insert(useCaseLibrary).values({
                        industry: recipe.industry || "General",
                        title: recipe.title,
                        description: recipe.public_view?.solution_narrative || "No description",
                        roiEstimate: recipe.public_view?.roi_estimate || "N/A",
                        difficulty: recipe.admin_view?.implementation_difficulty || "Med",
                        tags: recipe.admin_view?.tech_stack || [],
                        data: recipe, // NEW: Store full recipe
                        isPublished: false // DEFAULT TO DRAFT
                    });
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }
        }

        res.json({
            success: true,
            message: `Sync Complete. Added ${addedCount} new use cases. Skipped ${skippedCount} duplicates.`
        });

    } catch (error: any) {
        console.error('Sync Library Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

export default router;
