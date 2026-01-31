import express from 'express';
import { db } from '../db';
import { integrations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../utils/encryption';
import { OpenAIService } from '../services/openai';
import { UsageService } from '../services/usage';

const router = express.Router();

router.post('/generate', async (req, res) => {
    try {
        const { companyData, promptDetails } = req.body;
        // Check for Admin Key in DB (Integrations table)
        // We assume there's a system-wide or admin-owned integration named 'OpenAI'
        // In a multi-user app, we might check req.user.id, but here it's a platform key.

        // Find the "OpenAI" integration
        const integrationsList = await db.select().from(integrations)
            .where(eq(integrations.name, 'OpenAI')); // Case-sensitive match for now

        const openAIInt = integrationsList.find(i => i.enabled && (i.apiKey || i.apiSecret));

        if (!openAIInt || !openAIInt.apiKey) {
            console.warn("No OpenAI Integration found or enabled.");
            // Fallback: If no key is in DB, maybe they set it in ENV? (Legacy)
            if (!process.env.OPENAI_API_KEY) {
                return res.status(503).json({
                    error: 'OpenAI Integration not configured. please go to Admin > Integrations and add your OpenAI Key.'
                });
            }
        }

        const apiKey = openAIInt?.apiKey
            ? decrypt(openAIInt.apiKey)
            : process.env.OPENAI_API_KEY!;

        if (!companyData || !companyData.role || !companyData.painPoint) {
            return res.status(400).json({ error: 'Missing required company data' });
        }

        // Default Prompt (Fallback until DB persistence in Phase 2)
        const defaultSystemPrompt = `You are an expert Solutions Architect. Analyze the following user profile to design high-impact automation solutions.

User Profile:
- Industry: {{industry}}
- Role: {{role}}
- Tech Stack: {{stack}}
- Primary Pain Point: {{painPoint}}

Generate 3 custom automation blueprints in JSON format. Each blueprint MUST include: Title, Department, Problem, Solution Narrative, Value Proposition, ROI Estimate, Deep Dive, Example Scenario, Walkthrough Steps, Tech Stack Details, Difficulty, and Upsell.`;

        // 1. Prepare Prompt (Simple Injection for Phase 1)
        let systemPrompt = promptDetails?.systemPromptOverride || defaultSystemPrompt;

        // Basic variable replacement
        const replacements: Record<string, string> = {
            '{{role}}': companyData.role,
            '{{industry}}': companyData.industry || 'General',
            '{{painPoint}}': companyData.painPoint,
            '{{stack}}': Array.isArray(companyData.stack) ? companyData.stack.join(', ') : companyData.stack || '',
            '{{url}}': companyData.url || '',
            '{{size}}': companyData.size || ''
        };

        Object.entries(replacements).forEach(([key, value]) => {
            systemPrompt = systemPrompt.replace(new RegExp(key, 'g'), value);
        });

        // 2. Budget Check & Call OpenAI
        try {
            // Check Daily Budget
            await UsageService.checkBudgetExceeded();

            const result = await OpenAIService.generateJSON({
                systemPrompt,
                userContext: JSON.stringify(companyData),
                model: 'gpt-4o',
                apiKey: apiKey // Pass the retrieved key
            });

            // Log Usage (Async, non-blocking)
            // Note: OpenAI API doesn't always return token counts in the streamlined 'json_object' mode unless requested.
            // For now, we'll estimate or if OpenAIService returns full response object we use that.
            // Since OpenAIService returns just the parsed content, we'll estimate based on lengths.
            // Accurate estimation: 1 token ~= 4 chars
            const promptTokens = Math.ceil(systemPrompt.length / 4) + Math.ceil(JSON.stringify(companyData).length / 4);
            const completionTokens = Math.ceil(JSON.stringify(result).length / 4);

            UsageService.logUsage(promptTokens, completionTokens, 'gpt-4o').catch(err => console.error("Usage Log Error:", err));

            // 3. Return Blueprints
            res.json(result);
        } catch (err: any) {
            if (err.message && err.message.includes('budget exceeded')) {
                console.warn("Budget Limit Hit:", err.message);
                return res.status(429).json({ error: 'Daily AI Budget Exceeded. Falling back to static templates.' });
            }
            throw err;
        }

    } catch (error) {
        console.error('Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate blueprints' });
    }
});

export default router;
