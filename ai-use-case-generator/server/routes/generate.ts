import express from 'express';
import { db } from '../db';
import { integrations, industryIcps } from '../db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import { decrypt } from '../utils/encryption';
import { OpenAIService } from '../services/openai';
import { UsageService } from '../services/usage';
import { GeminiService } from '../services/gemini'; // Static import
import { AuthRequest, requireAuth } from '../middleware/auth';
import { buildIcpContext } from '../lib/prompts';


const router = express.Router();

router.post('/generate', async (req, res) => {
    try {
        const { companyData, promptDetails } = req.body;
        // Check for Admin Key in DB (Integrations table)
        // We assume there's a system-wide or admin-owned integration named 'OpenAI'
        // In a multi-user app, we might check req.user.id, but here it's a platform key.

        // Optional: Get user context if authenticated (but don't require it)
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || null; // null for anonymous users

        // Check for ANY active AI integration (Global Scope)
        const integrationsList = await db.select().from(integrations)
            .where(eq(integrations.enabled, true));

        // Find Enabled Integration with keys
        // Priority: Metadata 'provider' set -> First found
        const activeInt = integrationsList.find(i => i.enabled && (i.apiKey || i.apiSecret));

        if (!activeInt || (!activeInt.apiKey && !activeInt.apiSecret)) {
            console.warn("No Active AI Integration found.");
            return res.status(503).json({
                error: 'No active AI Provider found. Configure OpenAI or Gemini in Admin > Integrations.'
            });
        }

        const apiKey = activeInt?.apiKey
            ? decrypt(activeInt.apiKey)
            : process.env.OPENAI_API_KEY!;

        if (!companyData || !companyData.painPoint) {
            return res.status(400).json({ error: 'Missing required company data (painPoint is required)' });
        }

        // 0. Industry ICP Lookup & Context Injection
        let icpContext = "";

        if (companyData.industry) {
            // Default to 'dewpoint' (Business Owner) if not specified
            const targetType = companyData.icpType || 'dewpoint';

            const icpMatch = await db.select().from(industryIcps)
                .where(and(
                    ilike(industryIcps.industry, companyData.industry),
                    eq(industryIcps.icpType, targetType)
                ))
                .limit(1);

            // ... inside route ...

            if (icpMatch.length > 0) {
                const icp = icpMatch[0];
                console.log(`[Generate] Applied ICP: ${icp.industry} (${targetType})`);

                icpContext = buildIcpContext(icp, targetType);
            } else {
                console.log(`[Generate] No specific ICP found for ${companyData.industry} (${targetType}), using generic fallback.`);
            }
        }

        // Default Prompt (Fallback until DB persistence in Phase 2)
        const defaultSystemPrompt = `You are an expert Solutions Architect. Analyze the following user profile to design high-impact automation solutions.
${icpContext}

User Profile:
- Industry: {{industry}}
- Role: {{role}}
- Tech Stack: {{stack}}
- Primary Pain Point: {{painPoint}}
- Website Summary: {{description}}
- Deep Site Analysis: {{pageContext}}

Generate 3 custom automation blueprints in JSON format. Each blueprint MUST include: Title, Department, Industry (specific to the use case or general), Problem, Solution Narrative, Value Proposition, ROI Estimate, Deep Dive, Example Scenario, Walkthrough Steps, Tech Stack Details, Difficulty, and Upsell.

CRITICAL: Use the "Deep Site Analysis" key signals and text to find specific "dormant data" opportunities or "competitor gaps" (e.g. if they lack online booking, suggest an AI scheduler).`;

        // 1. Prepare Prompt (Simple Injection for Phase 1)
        let systemPrompt = promptDetails?.systemPromptOverride || defaultSystemPrompt;

        // Safety: Enforce "JSON" keyword for OpenAI json_object mode
        if (!systemPrompt.toLowerCase().includes('json')) {
            systemPrompt += " \n\nIMPORTANT: You must output strictly valid JSON.";
        }

        // Basic variable replacement
        const replacements: Record<string, string> = {
            '{{role}}': companyData.role,
            '{{industry}}': companyData.industry || 'General',
            '{{painPoint}}': companyData.painPoint,
            '{{stack}}': Array.isArray(companyData.stack) ? companyData.stack.join(', ') : companyData.stack || '',
            '{{url}}': companyData.url || '',
            '{{size}}': companyData.size || '',
            '{{description}}': companyData.description || 'N/A',
            '{{pageContext}}': companyData.context ? JSON.stringify(companyData.context, null, 2) : 'No deep context available.'
        };

        Object.entries(replacements).forEach(([key, value]) => {
            systemPrompt = systemPrompt.replace(new RegExp(key, 'g'), value);
        });

        // 2. Budget Check & Call OpenAI
        try {
            // Check Daily Budget
            await UsageService.checkBudgetExceeded();

            // Determine Provider & Model
            const metadata = activeInt.metadata as any || {};
            const provider = metadata.provider || (activeInt.name.toLowerCase().includes('gemini') ? 'gemini' : 'openai');
            const modelId = metadata.model; // e.g. 'gemini-1.5-pro' or 'gpt-4-turbo'

            const aiParams = {
                systemPrompt,
                userContext: JSON.stringify(companyData),
                model: modelId, // OpenAIService defaults to gpt-4o if undefined, GeminiService defaults to 1.5-pro
                apiKey
            };

            let result;
            if (provider === 'gemini') {
                result = await GeminiService.generateJSON(aiParams);
            } else {
                result = await OpenAIService.generateJSON(aiParams);
            }

            // Log Usage (Async, non-blocking)
            // Note: OpenAI API doesn't always return token counts in the streamlined 'json_object' mode unless requested.
            // For now, we'll estimate or if OpenAIService returns full response object we use that.
            // Since OpenAIService returns just the parsed content, we'll estimate based on lengths.
            // Accurate estimation: 1 token ~= 4 chars
            const promptTokens = Math.ceil(systemPrompt.length / 4) + Math.ceil(JSON.stringify(companyData).length / 4);
            const completionTokens = Math.ceil(JSON.stringify(result).length / 4);

            // Log usage for all requests (authenticated and anonymous)
            // Use userId if available, otherwise use null for anonymous tracking
            const userIdForLogging = userId || null;
            const shadowId = (req as any).shadowId;
            UsageService.logUsage(userIdForLogging, promptTokens, completionTokens, 'gpt-4o', shadowId).catch(err => console.error("Usage Log Error:", err));

            // 3. Return Blueprints with Metadata
            const finalBlueprints = Array.isArray(result.blueprints || result.opportunities)
                ? (result.blueprints || result.opportunities)
                : (Array.isArray(result) ? result : []);

            const enrichedBlueprints = finalBlueprints.map((b: any) => {
                // Heuristic: If AI returns flat keys, map them to our Schema
                // Check if it already has the structure
                if (b.public_view && b.admin_view) {
                    return {
                        ...b,
                        industry: b.industry || companyData.industry || 'General',
                        generation_metadata: {
                            source: 'AI',
                            model: modelId,
                            timestamp: new Date().toISOString()
                        }
                    };
                }

                // Map Flat Keys to Nested Schema
                return {
                    title: b.Title || b.title || "Untitled Blueprint",
                    department: b.Department || b.department || "General",
                    industry: b.Industry || b.industry || companyData.industry || "General",
                    public_view: {
                        problem: b.Problem || b.problem || "No problem defined.",
                        solution_narrative: b['Solution Narrative'] || b.solution_narrative || b.Solution || "No solution defined.",
                        value_proposition: b['Value Proposition'] || b.value_proposition || "No value prop defined.",
                        roi_estimate: b['ROI Estimate'] || b.roi_estimate || b.ROI || "N/A",
                        detailed_explanation: b['Deep Dive'] || b.deep_dive || b.DeepDive || "",
                        example_scenario: b['Example Scenario'] || b.example_scenario || "",
                        walkthrough_steps: b['Walkthrough Steps'] || b.walkthrough_steps || []
                    },
                    admin_view: {
                        tech_stack: b['Tech Stack Details'] || b.tech_stack || [],
                        implementation_difficulty: (b.Difficulty || b.difficulty || "Med") as "High" | "Med" | "Low",
                        workflow_steps: typeof b.Walkthrough === 'string' ? b.Walkthrough : (b['Workflow Steps'] || ""),
                        upsell_opportunity: b.Upsell || b['Upsell Opportunity'] || b.upsell_opportunity || "Consultation"
                    },
                    generation_metadata: {
                        source: 'AI',
                        model: modelId,
                        timestamp: new Date().toISOString()
                    }
                };
            });

            res.json({ blueprints: enrichedBlueprints });
        } catch (err: any) {
            if (err.message && err.message.includes('budget exceeded')) {
                console.warn("Budget Limit Hit:", err.message);
                return res.status(429).json({ error: 'Daily AI Budget Exceeded. Falling back to static templates.' });
            }
            // Propagate specific API errors (like 400 Bad Request from OpenAI)
            console.error('AI Provider Error:', err);
            const status = err.status || 500;
            const message = err.message || 'Unknown AI Error';
            return res.status(status).json({ error: `AI Generation Failed: ${message}`, details: err.error || err });
        }

    } catch (error: any) {
        console.error('Generation Handler Error:', error);
        res.status(500).json({ error: `Failed to generate blueprints: ${error.message}` });
    }
});

export default router;
