
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
