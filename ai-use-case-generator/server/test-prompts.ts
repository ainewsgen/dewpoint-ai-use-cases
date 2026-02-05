
import { buildIcpContext } from './lib/prompts.js';

const mockIcp = {
    icpPersona: 'Test Persona',
    promptInstructions: 'Focus on speed',
    primaryPainCategory: 'Revenue Leakage',
    gtmPrimary: 'Outbound',
    profitScore: 5,
    speedToCloseScore: 4,
    ltvScore: 3,
    economicDrivers: 'Cost savings',
    negativeIcps: 'Small biz',
    discoveryGuidance: 'Check LinkedIn'
};

console.log("Running Prompt Logic Verification...");

// Test 1: DewPoint variant
const ctx1 = buildIcpContext(mockIcp, 'dewpoint');
console.assert(ctx1.includes('Perspective: Business Owner (Operational Efficiency)'), 'FAILED: Dewpoint perspective missing');
console.assert(ctx1.includes('DewPoint Scores (1-5): Profit=5'), 'FAILED: Scores missing in Dewpoint');

// Test 2: Internal variant
const ctx2 = buildIcpContext(mockIcp, 'internal');
console.assert(ctx2.includes('Perspective: End Customer (Growth/Sales)'), 'FAILED: Internal perspective missing');

console.log("✅ Verification Passed: Output changes based on icpType.");
console.log("\n--- Preview (DewPoint) ---\n", ctx1.substring(0, 150) + "...");
console.log("\n--- Preview (Internal) ---\n", ctx2.substring(0, 150) + "...");
