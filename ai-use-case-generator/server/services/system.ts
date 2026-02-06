import { GeminiService } from './gemini.js';
import industries from '../data/industries-smb.json' assert { type: "json" };
export class SystemCapabilityService {
    /**
     * Maps a raw user input (e.g. "Topical Analgesics") to the closest known 
     * industry in our taxonomy (e.g. "Medical").
     */
    static async normalizeIndustry(rawInput: string): Promise<string | null> {
        console.log(`[Normalization] Mapping "${rawInput}" to taxonomy...`);

        // 1. Check for exact match first (case-insensitive)
        const exact = industries.find(i => i.industry.toLowerCase() === rawInput.toLowerCase());
        if (exact) return exact.industry;

        // 2. Use AI to semantic match
        try {
            // Create a condensed list of options for the context window
            const options = industries.map(i => i.industry).join(", ");

            const prompt = `
                You are a semantic classifier. Map the user's input to the closest matching Industry Category from the provided list.
                
                USER INPUT: "${rawInput}"
                
                ALLOWED CATEGORIES:
                ${options}
                
                INSTRUCTIONS:
                - Return ONLY the exact string of the matching category.
                - If the input is completely unrelated to any category, return "General".
                - Do not add markdown or explanation.
            `;

            const result = await GeminiService.generateJSON({
                apiKey: process.env.GEMINI_API_KEY!,
                model: 'gemini-1.5-flash',
                systemPrompt: "You are a JSON classifier. Output format: { \"match\": \"Category Name\" }",
                userContext: prompt
            });

            console.log(`[Normalization] Mapped "${rawInput}" -> "${result.match}"`);
            return result.match || null;

        } catch (err) {
            console.warn("[Normalization] AI mapping failed:", err);
            return null; // Fallback to original flow
        }
    }

    static generateFallback(industry: string, role: string) {
        // Return a generic, high-quality template that works for any industry
        return [
            {
                title: "Lead Conversion Scout",
                department: "Sales/Growth",
                industry: industry || "General",
                public_view: {
                    problem: "Delayed or inconsistent responses to inbound inquiries lead to missed revenue and poor brand perception.",
                    solution_narrative: "An intelligent, 24/7 engagement layer that instantly qualifies leads, handles initial friction points, and delivers value-first responses.",
                    value_proposition: "Eliminate response latency and capture 100% of pipeline intent.",
                    roi_estimate: "15-22% increase in discovery call conversion; saves 12+ hours/week of manual triage.",
                    detailed_explanation: "This solution bridges the gap between 'interest' and 'intent'. By providing immediate, relevant answers to FAQs and dynamic routing for high-value prospects, it ensures your sales team only focuses on qualified opportunities.",
                    example_scenario: "A prospect visits at 9 PM on a Sunday. Instead of waiting for Monday morning, they receive a tailored PDF summary and a link to book a priority meeting.",
                    walkthrough_steps: [
                        "Map high-intent friction points and top 10 FAQs.",
                        "Configure the intelligent response logic and value-add asset delivery.",
                        "Integrate with existing CRM or notification stack.",
                        "Activate the conversion layer and monitor velocity increase."
                    ]
                },
                admin_view: {
                    tech_stack: ["CRM Integration", "Asset Delivery API", "Workflow Engine"],
                    implementation_difficulty: "Low",
                    workflow_steps: "Inquiry -> Context Extraction -> Value Asset Match -> Instant Response / Team Notify.",
                    upsell_opportunity: "Multi-channel Lead Nurturing & Enrichment"
                },
                generation_metadata: {
                    source: "System (Fallback)",
                    model: "static-template-v3",
                    timestamp: new Date().toISOString()
                }
            },
            {
                title: "Stakeholder Trust Synchronizer",
                department: "Operations/CS",
                industry: industry || "General",
                public_view: {
                    problem: "Manual, fragmented onboarding processes create 'dead zones' where clients lose momentum and trust.",
                    solution_narrative: "A unified, automated delivery system that orchestrates information gathering, contract execution, and value-realization milestones.",
                    value_proposition: "Accelerate time-to-value and solidify professional brand authority.",
                    roi_estimate: "45% reduction in onboarding cycle time; reduces churn risk by 30% in the first 90 days.",
                    detailed_explanation: "Replace manual follow-ups with a proactive synchronization engine. This system ensures every stakeholder knows exactly where they are in the process, reducing friction and administrative overhead.",
                    example_scenario: "Contract is signed. Instantly, the Slack channel is created, the intake portal is populated, and the client receives their first 'Quick Win' milestone.",
                    walkthrough_steps: [
                        "Audit documentation requirements and milestone dependencies.",
                        "Automate the information gathering and contract execution loop.",
                        "Setup real-time visibility for all stakeholders.",
                        "Launch the synchronized experience and track time-to-value."
                    ]
                },
                admin_view: {
                    tech_stack: ["E-Signature Provider", "Project API", "Client Portal Wrapper"],
                    implementation_difficulty: "Med",
                    workflow_steps: "Signature -> Create Workspace -> Dispatch Intake -> Notify CS Manager.",
                    upsell_opportunity: "Complete Digital Client Portal Implementation"
                },
                generation_metadata: {
                    source: "System (Fallback)",
                    model: "static-template-v3",
                    timestamp: new Date().toISOString()
                }
            },
            {
                title: "Brand Sentiment Sentinel",
                department: "Marketing/PR",
                industry: industry || "General",
                public_view: {
                    problem: "Invisible client dissatisfaction and a lack of public validation hinder organic growth and professional credibility.",
                    solution_narrative: "A proactive feedback and trust-building automation that surfaces positive advocacy while intercepting negative friction privately.",
                    value_proposition: "Build a self-sustaining engine of trust and search authority.",
                    roi_estimate: "12-18% increase in organic leads via improved social proof and SEO velocity.",
                    detailed_explanation: "Don't leave your reputation to chance. This sentinel monitors customer success signals and automatically requests validation at the peak of satisfaction, ensuring your public profile reflects your actual performance.",
                    example_scenario: "A client reaches a project milestone or positive result. The sentinel detects the 'win' and asks for a professional endorsement via a one-click process.",
                    walkthrough_steps: [
                        "Define 'Moment of Delight' triggers across the client journey.",
                        "Draft professional, high-conversion validation requests.",
                        "Setup the sentinel to monitor success signals.",
                        "Analyze sentiment trends and manage public trust signals."
                    ]
                },
                admin_view: {
                    tech_stack: ["Messaging API", "Reputation Monitoring", "Sentiment Webhooks"],
                    implementation_difficulty: "Low",
                    workflow_steps: "Success Signal -> Wait Period -> Dispatch Request -> Triage Sentiment.",
                    upsell_opportunity: "Ongoing Reputation Management & PR Strategy"
                },
                generation_metadata: {
                    source: "System (Fallback)",
                    model: "static-template-v3",
                    timestamp: new Date().toISOString()
                }
            }
        ];
    }
}
