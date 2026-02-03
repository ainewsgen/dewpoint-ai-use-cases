import express from 'express';
import { db } from '../db';
import { integrations, industryIcps } from '../db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import { decrypt } from '../utils/encryption';
import { OpenAIService } from '../services/openai';
import { UsageService } from '../services/usage';
import { GeminiService } from '../services/gemini'; // Static import
import { AuthRequest, requireAuth } from '../middleware/auth';
import { buildIcpContext, buildGenericContext } from '../lib/prompts';
import { SystemCapabilityService } from '../services/system';


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


        if (!companyData || !companyData.painPoint) {
            return res.status(400).json({ error: 'Missing required company data (painPoint is required)' });
        }

        // 0. Industry ICP Lookup & Context Injection
        let icpContext = "";

        if (companyData.industry) {
            // Check for explicit "General" flag or string
            if (companyData.industry.toLowerCase().includes('general') || companyData.industry === 'Cross-Industry') {
                console.log(`[Generate] Using Generic Context`);
                icpContext = buildGenericContext();
            } else {
                // Default to 'dewpoint' (Business Owner) if not specified
                const targetType = companyData.icpType || 'dewpoint';

                const icpMatch = await db.select().from(industryIcps)
                    .where(and(
                        ilike(industryIcps.industry, companyData.industry),
                        eq(industryIcps.icpType, targetType)
                    ))
                    .limit(1);

                if (icpMatch.length > 0) {
                    const icp = icpMatch[0];
                    console.log(`[Generate] Applied ICP: ${icp.industry} (${targetType})`);

                    icpContext = buildIcpContext(icp, targetType);
                } else {
                    console.log(`[Generate] No specific ICP found for ${companyData.industry} (${targetType}), using generic fallback.`);
                    // Also use generic context here as a better fallback than empty string?
                    icpContext = buildGenericContext();
                }
            }
        } else {
            // No industry provided at all -> Use Generic
            icpContext = buildGenericContext();
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

        // 2. Integration Selection & Failover Loop
        // Fetch all enabled integrations, sorted by priority (1 = Primary, 2 = Backup, 0 = Last)
        // We filter out those without keys.
        const integrationsList = await db.select().from(integrations)
            .where(eq(integrations.enabled, true))
            .orderBy(integrations.priority); // Ascending: 0, 1, 2... 
        // Actually we want 1 to be first. 0 default usually means unprioritized.
        // Let's sort manually to handle 0 as "lowest"? 
        // Or just assume user sets 1 and 2. 
        // If we use standard sort: 1, 2, 3... 0 (if 0 is default).
        // Wait, SQL order by: 0, 1, 2.
        // So default (0) comes FIRST. That might be wrong if 1 is "Primary".
        // Let's handle sorting in JS to be safe: 1, 2, ..., then 0.

        const sortedIntegrations = integrationsList
            .filter(i => (i.apiKey || i.apiSecret))
            .sort((a, b) => {
                const pA = a.priority || 999; // Treat 0 or null as low priority (high number)
                const pB = b.priority || 999;
                const valA = pA === 0 ? 999 : pA;
                const valB = pB === 0 ? 999 : pB;
                return valA - valB;
            });

        // Loop through integrations
        let successResult = null;
        let usedModelId = '';
        let usedProvider = '';

        // Check Daily Budget ONCE before trying loop (Approximate)
        try {
            await UsageService.checkBudgetExceeded();
        } catch (e: any) {
            console.warn("Budget Limit Hit Pre-Check:", e.message);
            // Budget exceeded -> Use System Fallback immediately
            const fallback = SystemCapabilityService.generateFallback(companyData.industry, companyData.role);
            return res.json({ blueprints: fallback });
        }

        for (const activeInt of sortedIntegrations) {
            try {
                const apiKey = activeInt.apiKey ? decrypt(activeInt.apiKey) : '';
                if (!apiKey && !process.env.OPENAI_API_KEY) continue; // Skip if no key available

                const realKey = apiKey || process.env.OPENAI_API_KEY!;

                const metadata = activeInt.metadata as any || {};
                const provider = metadata.provider || (activeInt.name.toLowerCase().includes('gemini') ? 'gemini' : 'openai');
                const modelId = metadata.model || (provider === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4o');

                console.log(`[Failover] Trying Priority ${activeInt.priority || 0} - ${activeInt.name} (${provider}:${modelId})...`);

                const aiParams = {
                    systemPrompt,
                    userContext: JSON.stringify(companyData),
                    model: modelId,
                    apiKey: realKey
                };

                let result;
                if (provider === 'gemini') {
                    result = await GeminiService.generateJSON(aiParams);
                } else {
                    result = await OpenAIService.generateJSON(aiParams);
                }

                // If we get here, success!
                successResult = result;
                usedModelId = modelId;
                usedProvider = provider;

                // Log Usage
                const promptTokens = Math.ceil(systemPrompt.length / 4) + Math.ceil(JSON.stringify(companyData).length / 4);
                const completionTokens = Math.ceil(JSON.stringify(result).length / 4);
                const userIdForLogging = (req as AuthRequest).user?.id || null;
                const shadowId = (req as any).shadowId;
                UsageService.logUsage(userIdForLogging, promptTokens, completionTokens, usedModelId, shadowId).catch(err => console.error("Usage Log Error:", err));

                break; // Exit loop on success
            } catch (err: any) {
                console.warn(`[Failover] Integration ${activeInt.name} Failed:`, err.message);
                // Continue to next integration
            }
        }

        // 3. Fallback if All Integrations Fail
        if (!successResult) {
            console.warn("[Failover] All AI Integrations failed. Switching to SYSTEM FALLBACK.");
            const fallback = SystemCapabilityService.generateFallback(companyData.industry, companyData.role);
            return res.json({ blueprints: fallback });
        }

        // 4. Return Blueprints with Metadata (AI Success)
        const finalBlueprints = Array.isArray(successResult.blueprints || successResult.opportunities)
            ? (successResult.blueprints || successResult.opportunities)
            : (Array.isArray(successResult) ? successResult : []);

        const enrichedBlueprints = finalBlueprints.map((b: any) => {
            // Heuristic: If AI returns flat keys, map them to our Schema
            // Check if it already has the structure
            if (b.public_view && b.admin_view) {
                return {
                    ...b,
                    industry: b.industry || companyData.industry || 'General',
                    generation_metadata: {
                        source: 'AI',
                        model: usedModelId,
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
                    model: usedModelId,
                    timestamp: new Date().toISOString()
                }
            };
        });

        res.json({ blueprints: enrichedBlueprints });

    } catch (error: any) {
        console.error('Generation Handler Error:', error);
        res.status(500).json({ error: `Failed to generate blueprints: ${error.message}` });
    }
});

export default router;
