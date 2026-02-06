
import dotenv from 'dotenv';
import { SystemCapabilityService } from '../services/system.js';

// Load environment variables (for Gemini API Key)
dotenv.config();

async function test() {
    console.log("Starting Normalization Test...");

    const inputs = [
        "Topical Analgesics",
        "Roofing Contractor",
        "Digital Marketing for Dentists",
        "Space Rocket Manufacturing"
    ];

    for (const input of inputs) {
        console.log(`\n--- Testing: "${input}" ---`);
        const result = await SystemCapabilityService.normalizeIndustry(input);
        console.log(`Result: "${result}"`);
    }
}

test().catch(console.error);
