
import 'dotenv/config';
import { db } from '../db/index.js';
import { integrations } from '../db/schema.js';
import { decrypt } from '../utils/encryption.js';
import { OpenAIService } from '../services/openai.js';

async function checkIntegrations() {
    console.log("Checking integrations...");
    const allIntegrations = await db.select().from(integrations);

    if (allIntegrations.length === 0) {
        console.log("No integrations found.");
        process.exit(0);
    }

    for (const int of allIntegrations) {
        console.log("---------------------------------------------------");
        console.log(`ID: ${int.id}`);
        console.log(`Name: ${int.name}`);
        console.log(`Provider: ${int.provider}`); // Important: this might be 'gemini' or 'openai'
        console.log(`Enabled: ${int.enabled}`);

        if (int.apiKey) {
            try {
                const decryptedKey = decrypt(int.apiKey);
                const maskedKey = decryptedKey.substring(0, 3) + "..." + decryptedKey.substring(decryptedKey.length - 4);
                console.log(`API Key (Decrypted & Masked): ${maskedKey}`);

                // Helper to check if it looks like an OpenAI key
                if (decryptedKey.startsWith('sk-')) {
                    console.log("Key Format: Looks like a valid OpenAI key (starts with sk-)");
                    // Verify with a real call
                    console.log("Attempting to verify with OpenAI API...");
                    try {
                        await OpenAIService.generateJSON({
                            apiKey: decryptedKey,
                            systemPrompt: "You are a connection tester.",
                            userContext: "Return { \"status\": \"ok\", \"service\": \"openai\" } JSON.",
                            model: "gpt-3.5-turbo"
                        });
                        console.log("✅ VERIFICATION SUCCESS: Connection to OpenAI established.");
                    } catch (err: any) {
                        console.error("❌ VERIFICATION FAILED:", err.message);
                    }

                } else if (decryptedKey.startsWith('AIza')) { // Common Google API key prefix
                    console.log("Key Format: Looks like a Google/Gemini key (starts with AIza)");
                } else {
                    console.log("Key Format: Unknown format");
                }

            } catch (e) {
                console.log("Error decrypting key:", e);
            }
        } else {
            console.log("No API Key present.");
        }
    }
    console.log("---------------------------------------------------");
    process.exit(0);
}

checkIntegrations().catch(err => {
    console.error(err);
    process.exit(1);
});
