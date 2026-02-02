
import { db } from '../db';
import { industryIcps, integrations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { OpenAIService } from '../services/openai';
import { decrypt } from '../utils/encryption';
import industries from '../data/industries.json';
import smb1 from '../data/industries-smb.json';
import smb2 from '../data/industries-smb-2.json';
import dotenv from 'dotenv';

dotenv.config();

const allIndustries = [...industries, ...smb1, ...smb2];

// Delay helper to avoid rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getOpenAIKey() {
    // 1. Try Env
    if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

    // 2. Try DB
    console.log("   Looking for API Key in DB...");

    // Debug: List all enabled
    const allEnabled = await db.query.integrations.findMany({
        where: (t, { eq }) => eq(t.enabled, true)
    });
    console.log(`   Found ${allEnabled.length} enabled integrations: ${allEnabled.map(i => i.name).join(', ')}`);

    // Priority 1: OpenAI (Case insensitive)
    let integration = allEnabled.find(i => i.name?.toLowerCase().includes('openai'));

    // Priority 2: Any enabled integration with a key
    if (!integration && allEnabled.length > 0) {
        console.log("   No explicit 'OpenAI' integration found, using first available enabled integration.");
        integration = allEnabled[0];
    }

    if (integration && integration.apiKey) {
        console.log(`   Using Integration: ${integration.name}`);
        return decrypt(integration.apiKey);
    }

    throw new Error(`No usable API Key found. Checked ${allEnabled.length} integrations.`);
}

async function generateProfile(industry: any, type: 'dewpoint' | 'internal', apiKey: string) {
    const isB2B = type === 'dewpoint';
    const perspective = isB2B ? 'Business Owner' : 'End Customer';

    console.log(`   Generating ${perspective} profile for ${industry.industry}...`);

    const systemPrompt = `You are an expert GTM strategist. Generate a detailed Ideal Customer Profile (ICP) for the "${industry.industry}" industry (NAICS: ${industry.naics}).
    
Perspective: ${perspective}
- If Business Owner (B2B): Focus on the owner/executive of a company in this industry. Their pains are operational inefficiencies, costs, compliance, and scaling.
- If End Customer (B2C/B2B2C): Focus on the person or entity buying FROM this industry. Their pains are service quality, price, speed, and trust.

Return valid JSON matching this structure:
{
    "icpPersona": "Job Title or Persona Name",
    "promptInstructions": "Strategic focus for AI generation (e.g. 'Focus on automated scheduling to reduce admin overhead')",
    "primaryPainCategory": "One of: revenue_leakage, capacity_constraint, cost_overrun, compliance_risk, customer_experience, data_fragmentation",
    "profitScore": 1-5 integer,
    "speedToCloseScore": 1-5 integer,
    "ltvScore": 1-5 integer,
    "economicDrivers": "What maximizes their profit/value?",
    "negativeIcps": "Who strictly NOT to target",
    "discoveryGuidance": "One sentence on how to verify this prospect",
    "gtmPrimary": "One of: outbound, content, community, partner"
}`;

    const params = {
        systemPrompt,
        userContext: `Industry: ${industry.industry}`,
        apiKey,
        model: 'gpt-4o'
    };

    try {
        const data = await OpenAIService.generateJSON(params);
        return data; // Assume valid if JSON parses
    } catch (e: any) {
        console.error(`   Failed to generate for ${industry.industry}: ${e.message}`);
        return null;
    }
}

// Helper to validate and fallback Enums
function validateEnum(val: string, allowed: string[], fallback: string, fieldName: string): string {
    if (!val) return fallback;
    const normalized = val.toLowerCase().trim().replace(/ /g, '_'); // "Cost Overrun" -> "cost_overrun"

    // 1. Direct match
    if (allowed.includes(normalized)) return normalized;

    // 2. Fuzzy/Logic Mapping (Common AI Hallucinations)
    if (fieldName === 'pain') {
        if (normalized.includes('efficiency') || normalized.includes('slow')) return 'capacity_constraint';
        if (normalized.includes('compliance') || normalized.includes('risk')) return 'compliance_risk';
        if (normalized.includes('cost') || normalized.includes('budget')) return 'cost_overrun';
        if (normalized.includes('revenue') || normalized.includes('leakage')) return 'revenue_leakage';
        if (normalized.includes('data') || normalized.includes('silo')) return 'data_fragmentation';
        return 'revenue_leakage'; // Default safe fallback
    }

    // 3. General Fallback
    console.warn(`   ⚠️ Warning: Invalid enum for ${fieldName}: "${val}". Used fallback: "${fallback}"`);
    return fallback;
}

// Allowed Enum Values (Must match DB schema exact strings)
const ENUMS = {
    pain: ['revenue_leakage', 'capacity_constraint', 'cost_overrun', 'compliance_risk', 'customer_experience', 'data_fragmentation'],
    gtm: ['outbound', 'content', 'community', 'partner'],
    timeToValue: ['<30_days', '30_60_days', '60_90_days', 'gt_90_days'],
    complexity: ['single_decision_maker', 'dual_approval', 'committee_light', 'committee_heavy'],
    readiness: ['low', 'medium', 'high']
};

async function seed() {
    console.log("🌱 Starting ICP Seeding Process...");
    const apiKey = await getOpenAIKey();
    console.log("   API Key detected.");

    for (const ind of allIndustries) {
        console.log(`\nProcessing [${ind.rank}/200]: ${ind.industry} (${ind.category})`);

        // Check & Create Generic/B2B (DewPoint)
        const existingB2B = await db.query.industryIcps.findFirst({
            where: (t, { eq, and }) => and(eq(t.industry, ind.industry), eq(t.icpType, 'dewpoint'))
        });

        if (!existingB2B) {
            const profile = await generateProfile(ind, 'dewpoint', apiKey);
            if (profile) {
                // Validate Enums
                const validPain = validateEnum(profile.primaryPainCategory, ENUMS.pain, 'capacity_constraint', 'pain');
                const validGtm = validateEnum(profile.gtmPrimary, ENUMS.gtm, 'outbound', 'gtm');

                await db.insert(industryIcps).values({
                    industry: ind.industry,
                    icpType: 'dewpoint',
                    perspective: 'Business Owner',
                    naicsCode: ind.naics,
                    icpPersona: profile.icpPersona,
                    promptInstructions: profile.promptInstructions,
                    primaryPainCategory: validPain as any, // Cast for Drizzle
                    profitScore: profile.profitScore,
                    ltvScore: profile.ltvScore,
                    speedToCloseScore: profile.speedToCloseScore,
                    economicDrivers: profile.economicDrivers,
                    negativeIcps: profile.negativeIcps,
                    discoveryGuidance: profile.discoveryGuidance,
                    gtmPrimary: validGtm as any
                });
                console.log(`   ✅ Created B2B Profile`);
                await delay(500);
            }
        } else {
            console.log(`   ✓ B2B Profile exists`);
        }

        // Check & Create End Customer (Internal)
        const existingB2C = await db.query.industryIcps.findFirst({
            where: (t, { eq, and }) => and(eq(t.industry, ind.industry), eq(t.icpType, 'internal'))
        });

        if (!existingB2C) {
            const profile = await generateProfile(ind, 'internal', apiKey);
            if (profile) {
                // Validate Enums
                const validPain = validateEnum(profile.primaryPainCategory, ENUMS.pain, 'customer_experience', 'pain');
                const validGtm = validateEnum(profile.gtmPrimary, ENUMS.gtm, 'content', 'gtm');

                await db.insert(industryIcps).values({
                    industry: ind.industry,
                    icpType: 'internal',
                    perspective: 'End Customer',
                    naicsCode: ind.naics,
                    icpPersona: profile.icpPersona,
                    promptInstructions: profile.promptInstructions,
                    primaryPainCategory: validPain as any,
                    profitScore: profile.profitScore,
                    ltvScore: profile.ltvScore,
                    speedToCloseScore: profile.speedToCloseScore,
                    economicDrivers: profile.economicDrivers,
                    negativeIcps: profile.negativeIcps,
                    discoveryGuidance: profile.discoveryGuidance,
                    gtmPrimary: validGtm as any
                });
                console.log(`   ✅ Created End Customer Profile`);
                await delay(500);
            }
        } else {
            console.log(`   ✓ End Customer Profile exists`);
        }
    }

    console.log("\n✨ Seeding Complete!");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
