/**
 * Engine.ts
 * Simulates the "DewPoint Strategy Core" logic.
 */

export interface CompanyData {
    url: string;
    role: string;
    size: string;
    stack: string[];
    painPoint: string;
}

export interface Opportunity {
    title: string;
    department: string;
    type: 'Cost Saving' | 'Revenue Gen' | 'Efficiency';
    pain: string;
    solution: string;
    unlock: string;
    stack: string;
    difficulty: number; // 1-5
    roi: 'High' | 'Med' | 'Low';
}

export function generateOpportunities(companyData: CompanyData): Opportunity[] {
    const { stack, painPoint } = companyData;

    const opportunities: Opportunity[] = [];

    // 1. ADD: The personalized "Pain Killer"
    opportunities.push({
        title: "The Silent Assistant",
        department: getDepartmentFromPain(painPoint),
        type: "Cost Saving",
        pain: `You identified "${painPoint}" as a major bottleneck.`,
        solution: `An autonomous agent that intercepts "${painPoint}" tasks via email/Slack, processes the structured data, and updates your records without human touch.`,
        unlock: "LLMs can now parse unstructured 'messy' instructions.",
        stack: `Antigravity + ${stack[0] || 'Email'}`,
        difficulty: 3,
        roi: "High"
    });

    // 2. RECIPE: The Watchdog (Finance/Ops)
    const financeTool = stack.find(s => ['QuickBooks', 'Xero', 'NetSuite'].includes(s));
    if (financeTool) {
        opportunities.push({
            title: "The Invoice Watchdog",
            department: "Finance",
            type: "Cost Saving",
            pain: "Duplicate invoices and creeping vendor costs often go unnoticed.",
            solution: "A background agent that reviews every incoming PDF invoice against the contract terms and historical pricing.",
            unlock: "Computer Vision + Reasoning allows semantic understanding of PDFs.",
            stack: `Antigravity + ${financeTool}`,
            difficulty: 4,
            roi: "Med"
        });
    } else {
        opportunities.push({
            title: "Receipt Auto-Router",
            department: "Finance",
            type: "Cost Saving",
            pain: "Chasing employees for receipts.",
            solution: "Agent monitors email for receipts, matches them to credit card feed, and categorizes them automatically.",
            unlock: "Vision API accuracy.",
            stack: "Antigravity + Gmail",
            difficulty: 2,
            roi: "Low"
        });
    }

    // 3. RECIPE: The Synthesizer (Growth/Sales)
    const crmTool = stack.find(s => ['Salesforce', 'HubSpot', 'Pipedrive'].includes(s));
    if (crmTool) {
        opportunities.push({
            title: "The Omni-Channel Nurture",
            department: "Sales",
            type: "Revenue Gen",
            pain: "Leads go cold because manual follow-up is too slow.",
            solution: "When a lead visits the pricing page, generate a hyper-personalized video script and draft the email for the rep.",
            unlock: "Real-time browsing agents + content generation.",
            stack: `${crmTool} + LinkedIn Scraper`,
            difficulty: 5,
            roi: "High"
        });
    } else {
        opportunities.push({
            title: "The Lead Qualifier",
            department: "Sales",
            type: "Revenue Gen",
            pain: "Wasting time on bad leads.",
            solution: "Agent researches every new email inquiry on LinkedIn/Web and drafts the perfect reply for high-value prospects.",
            unlock: "Autonomous research capabilities.",
            stack: "Antigravity + Search",
            difficulty: 2,
            roi: "Med"
        });
    }

    // 4. RECIPE: The Bridge (Ops)
    opportunities.push({
        title: "The Project Pulse",
        department: "Operations",
        type: "Efficiency",
        pain: "Project updates require nagging the team.",
        solution: "Agent reads all commits/tickets/Slack updates daily and updates the Client Portal with a summary.",
        unlock: "Context window size allowing full day context summarization.",
        stack: "Slack + Jira/Trello",
        difficulty: 3,
        roi: "Med"
    });

    return opportunities;
}

function getDepartmentFromPain(pain: string): string {
    const p = pain.toLowerCase();
    if (p.includes('pay') || p.includes('bill') || p.includes('voice')) return 'Finance';
    if (p.includes('lead') || p.includes('sell') || p.includes('client')) return 'Sales';
    if (p.includes('hir') || p.includes('team')) return 'HR';
    return 'Operations';
}
