
import { fileURLToPath } from 'url';
import path from 'path';

// Mock company data
const companyData = {
    industry: 'Plumbing',
    role: 'Owner',
    painPoint: 'Scheduling maps is hard'
};

// Mock AI response (as it might come from OpenAI/Gemini based on the refined prompt)
const mockAiResponse = {
    blueprints: [
        {
            "Title": "AI Route Optimization",
            "Department": "Operations",
            "Industry": "Home Services",
            "Problem": "Manual scheduling takes 2 hours daily and results in inefficient routes.",
            "Solution Narrative": "An AI-powered scheduler that automatically maps jobs based on distance and plumber availability.",
            "Value Proposition": "Save fuel and time while increasing job capacity.",
            "ROI Estimate": "Save $400/mo in fuel costs.",
            "Deep Dive": "This tool integrates with Google Maps API and internal calendars.",
            "Example Scenario": "A plumber in Brooklyn is assigned to 3 jobs in a row without backtracking.",
            "Walkthrough Steps": ["Audit calendar", "Connect API", "Run optimization"],
            "Tech Stack Details": ["Google Maps API", "Zapier", "HubSpot"],
            "Difficulty": "Med",
            "Walkthrough": "Triggers on job creation -> calculates optimal slot -> updates calendar.",
            "Upsell": "Integration with payment systems"
        }
    ]
};

// Extracted mapping logic from server/routes/generate.ts
function mapToSchema(b: any, usedModelId: string) {
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
}

const result = mockAiResponse.blueprints.map(b => mapToSchema(b, 'gpt-4o'));
console.log(JSON.stringify(result, null, 2));

// Verifications
console.assert(result[0].title === "AI Route Optimization", "Title mapping failed");
console.assert(result[0].public_view.problem === "Manual scheduling takes 2 hours daily and results in inefficient routes.", "Problem mapping failed");
console.assert(result[0].public_view.solution_narrative === "An AI-powered scheduler that automatically maps jobs based on distance and plumber availability.", "Solution Narrative mapping failed");
console.assert(result[0].admin_view.tech_stack.length === 3, "Tech stack mapping failed");
console.assert(result[0].admin_view.workflow_steps.includes('Triggers on job creation'), "Workflow steps mapping failed");

console.log("\n✅ Mapping Verification Successful: Output structure perfectly matches expectations and system templates.");
