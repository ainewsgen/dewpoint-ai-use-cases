import { db } from '../db';
import { useCaseLibrary } from '../db/schema';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

const genericRecipes = [
    {
        title: "AI Meeting Assistant",
        industry: "General",
        description: "Automated meeting transcription, summarization, and action item extraction.",
        roiEstimate: "5hrs/week per manager",
        difficulty: "Low",
        tags: ["Productivity", "Operations", "Meetings"],
        data: {
            public_view: {
                problem: "Valuable insights from meetings are lost or require manual note-taking.",
                solution_narrative: "An AI agent joins meetings, records audio, and generates structured summaries.",
                value_proposition: "Never miss a detail and ensure accountability.",
                roi_estimate: "Save 5+ hours/week on follow-ups.",
                draft_content: "Connects to Zoom/Teams/Meet..."
            }
        }
    },
    {
        title: "Automated Invoice Processing",
        industry: "Finance",
        description: "Extract data from PDF invoices and sync to accounting software.",
        roiEstimate: "20hrs/month",
        difficulty: "Med",
        tags: ["Finance", "Accounting", "Automation"],
        data: { /* ... */ }
    },
    {
        title: "Customer Support Triaging",
        industry: "Support",
        description: "Classify incoming tickets and draft responses automatically.",
        roiEstimate: "Reduce response time by 60%",
        difficulty: "Med",
        tags: ["Support", "CS", "AI"],
        data: { /* ... */ }
    },
    {
        title: "Social Media Content Repurposing",
        industry: "Marketing",
        description: "Turn blog posts into tweets, LinkedIn posts, and newsletters.",
        roiEstimate: "10x Content Output",
        difficulty: "Low",
        tags: ["Marketing", "Social Media", "Content"],
        data: { /* ... */ }
    },
    {
        title: "Lead Scoring & Enrichment",
        industry: "Sales",
        description: "Enrich leads with LinkedIn data and score them by ICP fit.",
        roiEstimate: "Increase conversion by 15%",
        difficulty: "High",
        tags: ["Sales", "Growth", "CRM"],
        data: { /* ... */ }
    },
    {
        title: "Employee Onboarding Bot",
        industry: "HR",
        description: "Guide new hires through paperwork and answer FAQs via Slack/Teams.",
        roiEstimate: "Save HR 2hrs/hire",
        difficulty: "Med",
        tags: ["HR", "People", "Onboarding"],
        data: { /* ... */ }
    },
    {
        title: "Competitor Price Watch",
        industry: "Retail/E-com",
        description: "Monitor competitor pricing and adjust your own dynamically.",
        roiEstimate: "Increase margin by 5%",
        difficulty: "High",
        tags: ["Retail", "Pricing", "Strategy"],
        data: { /* ... */ }
    },
    {
        title: "Legal Contract Review",
        industry: "Legal",
        description: "Scan NDAs and contracts for risky clauses automatically.",
        roiEstimate: "Reduce legal bill by 30%",
        difficulty: "High",
        tags: ["Legal", "Compliance", "Contracts"],
        data: { /* ... */ }
    },
    {
        title: "Inventory Demand Forecasting",
        industry: "Operations",
        description: "Predict stock needs based on historical data and trends.",
        roiEstimate: "Reduce waste by 20%",
        difficulty: "High",
        tags: ["Operations", "Supply Chain", "Data"],
        data: { /* ... */ }
    },
    {
        title: "Personalized Email Outreach",
        industry: "Sales",
        description: "Generate hyper-personalized cold emails at scale.",
        roiEstimate: "3x Reply Rate",
        difficulty: "Med",
        tags: ["Sales", "Outbound", "Marketing"],
        data: { /* ... */ }
    }
];

async function seed() {
    console.log("Seeding generic recipes...");
    for (const recipe of genericRecipes) {
        await db.insert(useCaseLibrary).values({
            ...recipe,
            isPublished: true,
            data: recipe.data // Minimal data for now
        });
    }
    console.log("Done!");
    process.exit(0);
}

seed().catch(console.error);
