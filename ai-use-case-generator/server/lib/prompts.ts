
export function buildIcpContext(icp: any, targetType: string): string {
    const perspectiveLabel = targetType === 'dewpoint'
        ? 'Business Owner (Operational Efficiency)'
        : 'End Customer (Growth/Sales)';

    return `\n\n*** INDUSTRY INTELLIGENCE ACTIVE ***
Target Persona: ${icp.icpPersona}
Perspective: ${perspectiveLabel}
Strategic Focus: ${icp.promptInstructions}
Primary Pain Category: ${icp.primaryPainCategory || "General"}
GTM Motion: ${icp.gtmPrimary || "Standard"}
DewPoint Scores (1-5): Profit=${icp.profitScore || "N/A"}, Speed=${icp.speedToCloseScore || "N/A"}, LTV=${icp.ltvScore || "N/A"}

Economic Drivers: ${icp.economicDrivers || "N/A"}
Negative Constraints (Avoid): ${icp.negativeIcps || "None"}

Discovery Guidance: ${icp.discoveryGuidance || "N/A"}
`;
}

export function buildScanPrompt(metadata: any): string {
    return `You are an expert Industry Analyst. Retrieve the most accurate 6-digit NAICS code and Industry Classification for the given website analysis.

Website Context:
- URL: ${metadata.url}
- Title: ${metadata.title}
- Description: ${metadata.description}
- Key Headers: ${metadata.h1}; ${metadata.h2}
- Content Snippet: ${metadata.bodySnippet}

Instructions:
1. Analyze the content to determine the PRIMARY business activity.
2. Be specific. Do NOT genericize. (e.g., if "Remote Drafting", choose "Drafting Services" or "Engineering", NOT just "Consulting").
3. Identify the most likely tech stack used based on the signals or common industry standards.
4. Output strictly valid JSON.

JSON Schema:
{
  "industry": "Specific Industry Name (e.g. 'Drafting Services')",
  "naics": "6-digit code (e.g. '541340')",
  "summary": "1 sentence description of what the company does.",
  "stack_additions": ["Tool1", "Tool2"] (Array of specific software likely used, e.g. AutoCAD, Revit, Bluebeam)
}`;
}
