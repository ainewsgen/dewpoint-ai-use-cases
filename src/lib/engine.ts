/**
 * Engine.ts
 * Simulates the "DewPoint Strategy Core" logic.
 */

export interface CompanyData {
    url: string;
    industry?: string;
    role: string;
    size: string;
    stack: string[];
    painPoint: string;
}

export interface Opportunity {
    title: string;
    department: string;
    public_view: {
        problem: string;
        solution_narrative: string;
        value_proposition: string;
        roi_estimate: string;
    };
    admin_view: {
        tech_stack: string[];
        implementation_difficulty: 'High' | 'Med' | 'Low';
        workflow_steps: string;
        upsell_opportunity: string;
    };
}

export function generateOpportunities(companyData: CompanyData): Opportunity[] {
    const { stack, painPoint, role, industry } = companyData;

    const opportunities: Opportunity[] = [];

    // 1. ADD: The personalized "Pain Killer"
    opportunities.push({
        title: "The Silent Assistant",
        department: getDepartmentFromPain(painPoint),
        public_view: {
            problem: `You identified "${painPoint}" as a major daily friction point.`,
            solution_narrative: `An intelligent digital assistant that intercepts "${painPoint}" tasks, understands the context regardless of format, and handles the execution instantly without you lifting a finger.`,
            value_proposition: "Eliminates cognitive load and context switching.",
            roi_estimate: "10-15 hours/month saved"
        },
        admin_view: {
            tech_stack: ["Antigravity", stack[0] || 'Email API', "OpenAI GPT-4o"],
            implementation_difficulty: "Med",
            workflow_steps: "1. Ingest webhook/email 2. Parse intent via LLM 3. Extract structured JSON 4. Execute API call 5. Notify user.",
            upsell_opportunity: "Monthly maintenance & prompt tuning retainer."
        }
    });

    // 2. RECIPE: The Watchdog (Finance/Ops)
    const financeTool = stack.find(s => ['QuickBooks', 'Xero', 'NetSuite'].includes(s));
    if (financeTool) {
        opportunities.push({
            title: "The Invoice Watchdog",
            department: "Finance",
            public_view: {
                problem: "Duplicate invoices and creeping vendor costs often go unnoticed until it's too late.",
                solution_narrative: "A 24/7 auditor that reads every incoming PDF invoice, compares it against your contract terms, and alerts you only when it finds a mistake.",
                value_proposition: "Catches overbilling before payment is released.",
                roi_estimate: "$2k - $10k recovered annually"
            },
            admin_view: {
                tech_stack: ["Antigravity", financeTool, "Azure Document Intelligence"],
                implementation_difficulty: "High",
                workflow_steps: "1. Watch Gmail attachment 2. OCR PDF 3. Match PO # in NetSuite/Xero 4. Verify line item variance > 5% 5. Slack Alert.",
                upsell_opportunity: "Gain share of recovered revenue."
            }
        });
    } else {
        opportunities.push({
            title: "Receipt Auto-Router",
            department: "Finance",
            public_view: {
                problem: "Chasing employees for receipts is a low-value distraction.",
                solution_narrative: "Automatically matches email receipts to credit card transactions and categorizes them instantly.",
                value_proposition: "End-of-month reconciliation becomes 1-click.",
                roi_estimate: "5 hours/month saved"
            },
            admin_view: {
                tech_stack: ["Antigravity", "Gmail API", "Table Extractor"],
                implementation_difficulty: "Low",
                workflow_steps: "1. Monitor inbox for 'receipt' 2. Extract Merchant/Date/Amount 3. Match roughly with bank feed CSV.",
                upsell_opportunity: "Implementation fee only."
            }
        });
    }

    // 3. RECIPE: The Synthesizer (Growth/Sales)
    const crmTool = stack.find(s => ['Salesforce', 'HubSpot', 'Pipedrive'].includes(s));
    if (crmTool) {
        opportunities.push({
            title: "The Omni-Channel Nurture",
            department: "Sales",
            public_view: {
                problem: "Leads go cold because manual follow-up is too slow or generic.",
                solution_narrative: "When a high-value prospect visits your pricing page, this agent instantly researches them and drafts a hyper-personalized video script and email for your rep to approve.",
                value_proposition: "Increases response rates by 300%.",
                roi_estimate: "$50k net new revenue/qtr"
            },
            admin_view: {
                tech_stack: [crmTool, "LinkedIn Scraper", "HeyGen API", "OpenAI"],
                implementation_difficulty: "High",
                workflow_steps: "1. Identify IP via Clearbit 2. Scrape LinkedIn profile 3. Generate personalization via LLM 4. Create Draft in CRM.",
                upsell_opportunity: "High-value retainer for sales ops optimization."
            }
        });
    } else {
        opportunities.push({
            title: "The Lead Qualifier",
            department: "Sales",
            public_view: {
                problem: "Wasting time talking to unqualified leads.",
                solution_narrative: "Intelligently researches every new inquiry, scores them based on your criteria, and drafts the perfect reply.",
                value_proposition: "Focus time only on 5-star prospects.",
                roi_estimate: "10 hours/week saved"
            },
            admin_view: {
                tech_stack: ["Antigravity", "Google Search API", "Browserless.io"],
                implementation_difficulty: "Med",
                workflow_steps: "1. Webhook from Contact Form 2. Search Company Name 3. Scrape 'About Us' 4. Classify 'Good/Bad Fit' 5. Tag in CRM.",
                upsell_opportunity: "Monthly scraping credit markup."
            }
        });
    }

    // 4. RECIPE: The Bridge (Ops)
    opportunities.push({
        title: "The Project Pulse",
        department: "Operations",
        public_view: {
            problem: "Project updates require constantly nagging the team for status.",
            solution_narrative: "An observer that silently reads all project activity and automatically updates your client dashboard so they never have to ask 'where are we at?'.",
            value_proposition: "Improves client trust and retention.",
            roi_estimate: "Invaluable client goodwill"
        },
        admin_view: {
            tech_stack: ["Slack API", "Jira API", "Client Portal"],
            implementation_difficulty: "Med",
            workflow_steps: "1. Ingest daily commits/tickets 2. Summarize progress via LLM 3. Post to Notion/Portal 4. Slack Audit Log.",
            upsell_opportunity: "Portal build-out services."
        }
    });

    // 5. ADVANCED: Data Asset Audit (Dormant Data)
    // Check Role OR Industry for 'legal'/'consult'
    const roleLower = role.toLowerCase();
    const industryLower = (industry || '').toLowerCase();

    const isProfessionalServices =
        roleLower.includes('partner') ||
        roleLower.includes('legal') ||
        roleLower.includes('consult') ||
        industryLower.includes('legal') ||
        industryLower.includes('law') ||
        industryLower.includes('consult');

    if (isProfessionalServices) {
        opportunities.push({
            title: "The Case Miner",
            department: "Knowledge",
            public_view: {
                problem: "Your firm sits on decades of PDF case files that are effectively invisible to your current team.",
                solution_narrative: "An internal search engine that indexes every past case/project, allowing staff to ask 'Have we solved a problem like this before?' and get instant cited answers.",
                value_proposition: "Monetize your dormant intellectual property.",
                roi_estimate: "Reduces research time by 80%"
            },
            admin_view: {
                tech_stack: ["Antigravity", "Pinecone (Vector DB)", "LangChain"],
                implementation_difficulty: "High",
                workflow_steps: "1. Ingest PDF archive 2. Chunk & Embed 3. Semantic Search UI.",
                upsell_opportunity: "Enterprise Knowledge Base Retainer."
            }
        });
    }

    // 6. ADVANCED: Competitor Gap (Simulated)
    if (!stack.includes("LinkedIn")) {
        opportunities.push({
            title: "The Competitor Watchtower",
            department: "Strategy",
            public_view: {
                problem: "Competitors are launching moves you don't see until it's too late.",
                solution_narrative: "A silent scout that monitors your top 5 competitors' websites, hiring boards, and press releases daily, summarizing their strategy in a weekly briefing.",
                value_proposition: "Never be blindquided by market shifts.",
                roi_estimate: "Strategic agility"
            },
            admin_view: {
                tech_stack: ["Antigravity", "Browserless", "Summarization LLM"],
                implementation_difficulty: "Med",
                workflow_steps: "1. Daily scrape of target URLs 2. Diff check for changes 3. LLM summarizes strategic intent.",
                upsell_opportunity: "Market Intelligence Dashboard."
            }
        });
    }

    return opportunities;
}

function getDepartmentFromPain(pain: string): string {
    const p = pain.toLowerCase();
    if (p.includes('pay') || p.includes('bill') || p.includes('voice')) return 'Finance';
    if (p.includes('lead') || p.includes('sell') || p.includes('client')) return 'Sales';
    if (p.includes('hir') || p.includes('team')) return 'HR';
    return 'Operations';
}
