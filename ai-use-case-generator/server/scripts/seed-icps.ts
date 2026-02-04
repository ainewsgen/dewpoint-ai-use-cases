
import { db } from '../db/index.js';
import { industryIcps } from '../db/schema.js';
import { OpenAIService } from '../services/openai.js';
import { decrypt } from '../utils/encryption.js';
import industries from '../data/industries.json';
import smb1 from '../data/industries-smb.json';
import smb2 from '../data/industries-smb-2.json';
import dotenv from 'dotenv';
import { eq, and } from 'drizzle-orm';

dotenv.config();

const allIndustries = [...industries, ...smb1, ...smb2];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- 1. Utilities ---

async function getOpenAIKey() {
    if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    const allEnabled = await db.query.integrations.findMany({ where: (t, { eq }) => eq(t.enabled, true) });
    let integration = allEnabled.find(i => i.name?.toLowerCase().includes('openai')) || allEnabled[0];
    if (integration?.apiKey) return decrypt(integration.apiKey);
    throw new Error(`No usable API Key found.`);
}

function validateEnum(val: string, allowed: string[], fallback: string, fieldName: string): string {
    if (!val) return fallback;
    const normalized = val.toLowerCase().trim().replace(/ /g, '_');
    if (allowed.includes(normalized)) return normalized;
    if (fieldName === 'pain') {
        if (normalized.includes('efficiency') || normalized.includes('slow')) return 'capacity_constraint';
        if (normalized.includes('compliance') || normalized.includes('risk')) return 'compliance_risk';
        if (normalized.includes('cost') || normalized.includes('budget')) return 'cost_overrun';
        if (normalized.includes('revenue') || normalized.includes('leakage')) return 'revenue_leakage';
        return 'revenue_leakage';
    }
    return fallback;
}

const ENUMS = {
    pain: ['revenue_leakage', 'capacity_constraint', 'cost_overrun', 'compliance_risk', 'customer_experience', 'data_fragmentation'],
    gtm: ['outbound', 'content', 'community', 'partner'],
};

// --- 2. Prompts (Split Brain) ---

async function generateB2B(industry: any, apiKey: string) {
    const systemPrompt = `You are a GTM Strategist for DewPoint, selling services TO business owners in the ${industry.industry} industry.
    
    Target: Business Owner / Executive
    Goal: Identify their operational pains, regulatory needs, and where they hang out.

    Return JSON:
    {
        "icpPersona": "Exact Title of Owner/Buyer",
        "buyerTitles": ["Title 1", "Title 2"],
        "primaryPainCategory": "Enum: revenue_leakage, capacity_constraint, cost_overrun, compliance_risk",
        "regulatoryRequirements": "Specific regulations (e.g. OSHA 1910, SOC2, HIPAA)",
        "techSignals": ["Specific Software they use (e.g. Procore, Salesforce, QuickBooks)"],
        "communities": [
            { "name": "Specific Association or Event Name", "type": "physical", "region": "Global/US" },
            { "name": "Specific Subreddit or Forum", "type": "virtual", "region": "Online" }
        ],
        "profitScore": 1-5,
        "ltvScore": 1-5,
        "speedToCloseScore": 1-5,
        "gtmPrimary": "Enum: outbound, content, community, partner",
        "promptInstructions": "Strategic focus for generating use cases",
        "negativeIcps": "Who NOT to sell to",
        "discoveryGuidance": "One question to ask to disqualify them"
    }`;

    try {
        const data = await OpenAIService.generateJSON({
            systemPrompt,
            userContext: `Industry: ${industry.industry} (NAICS: ${industry.naics})`,
            apiKey,
            model: 'gpt-4o'
        });
        return data;
    } catch (e: any) {
        console.error(`   Failed B2B for ${industry.industry}: ${e.message}`);
        return null;
    }
}

async function generateB2C(industry: any, apiKey: string) {
    const systemPrompt = `You are a Marketing Strategist helping a company in ${industry.industry} find more customers.
    
    Target: End Customer (Consumer or Client buying FROM the industry)
    Goal: Understand how they search, what they value, and why they buy.

    Return JSON:
    {
        "icpPersona": "Description of the End Customer",
        "searchQueries": [
            { "channel": "Google", "query": "Specific search term 1" },
            { "channel": "Google", "query": "Specific search term 2" }
        ],
        "keywords": {
            "pain": ["keyword1", "keyword2"],
            "seo": ["keyword1", "keyword2"]
        },
        "primaryPainCategory": "Enum: customer_experience, price, trust",
        "profitScore": 1-5, 
        "ltvScore": 1-5,
        "gtmPrimary": "Enum: content, community, ads",
        "promptInstructions": "Focus for AI use cases targeting end customers",
        "economicDrivers": "What maximizes value for the customer?",
        "negativeIcps": "Customers to avoid"
    }`;

    try {
        const data = await OpenAIService.generateJSON({
            systemPrompt,
            userContext: `Industry: ${industry.industry}`,
            apiKey,
            model: 'gpt-4o'
        });
        return data;
    } catch (e: any) {
        console.error(`   Failed B2C for ${industry.industry}: ${e.message}`);
        return null;
    }
}


// --- 3. Main Loop ---

async function seed() {
    console.log("🌱 Starting ICP Seeding Process (Schema v2)...");
    const apiKey = await getOpenAIKey();

    // We want to RE-SEED to get new data. 
    // Option A: Delete all? No, that might break IDs. 
    // Option B: Upsert/Update.

    let processed = 0;
    for (const ind of allIndustries) {
        processed++;
        console.log(`\n[${processed}/200] ${ind.industry}`);

        // --- B2B ---
        const b2b = await generateB2B(ind, apiKey);
        if (b2b) {
            const validPain = validateEnum(b2b.primaryPainCategory, ENUMS.pain, 'capacity_constraint', 'pain');
            const validGtm = validateEnum(b2b.gtmPrimary, ENUMS.gtm, 'outbound', 'gtm');

            // Upsert Logic (Delete then Insert to keep ID or Update?)
            // Drizzle 'onConflictDoUpdate' is best, but basic update if exists is safer for now.
            const existing = await db.query.industryIcps.findFirst({
                where: (t, { and, eq }) => and(eq(t.industry, ind.industry), eq(t.icpType, 'dewpoint'))
            });

            const values = {
                industry: ind.industry,
                icpType: 'dewpoint' as const,
                perspective: 'Business Owner',
                naicsCode: ind.naics,
                icpPersona: b2b.icpPersona,
                promptInstructions: b2b.promptInstructions,
                primaryPainCategory: validPain as any,
                gtmPrimary: validGtm as any,

                // New Fields
                communities: b2b.communities,
                buyerTitles: b2b.buyerTitles,
                techSignals: b2b.techSignals,
                regulatoryRequirements: b2b.regulatoryRequirements,
                negativeIcps: b2b.negativeIcps,
                discoveryGuidance: b2b.discoveryGuidance,

                // Scores
                profitScore: b2b.profitScore,
                ltvScore: b2b.ltvScore,
                speedToCloseScore: b2b.speedToCloseScore,
            };

            if (existing) {
                await db.update(industryIcps)
                    .set(values)
                    .where(eq(industryIcps.id, existing.id));
                console.log(`   ✅ Updated B2B Profile (v2)`);
            } else {
                await db.insert(industryIcps).values(values as any);
                console.log(`   ✅ Created B2B Profile (v2)`);
            }
        }

        // --- B2C ---
        const b2c = await generateB2C(ind, apiKey);
        if (b2c) {
            const validPain = validateEnum(b2c.primaryPainCategory, ENUMS.pain, 'customer_experience', 'pain');

            const existing = await db.query.industryIcps.findFirst({
                where: (t, { and, eq }) => and(eq(t.industry, ind.industry), eq(t.icpType, 'internal'))
            });

            const values = {
                industry: ind.industry,
                icpType: 'internal' as const,
                perspective: 'End Customer',
                naicsCode: ind.naics,
                icpPersona: b2c.icpPersona,
                promptInstructions: b2c.promptInstructions,
                primaryPainCategory: validPain as any,

                // New Fields
                searchQueries: b2c.searchQueries,
                keywords: b2c.keywords,
                economicDrivers: b2c.economicDrivers,
                negativeIcps: b2c.negativeIcps,

                // Scores
                profitScore: b2c.profitScore,
                ltvScore: b2c.ltvScore
            };

            if (existing) {
                await db.update(industryIcps)
                    .set(values)
                    .where(eq(industryIcps.id, existing.id));
                console.log(`   ✅ Updated End Customer Profile (v2)`);
            } else {
                await db.insert(industryIcps).values(values as any);
                console.log(`   ✅ Created End Customer Profile (v2)`);
            }
        }

        await delay(200); // Slight delay
    }

    console.log("\n✨ Seeding Complete!");
    process.exit(0);
}

seed().catch(console.error);
