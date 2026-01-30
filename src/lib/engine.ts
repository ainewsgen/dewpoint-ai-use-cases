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
    name?: string;
    email?: string;
}

export interface Opportunity {
    title: string;
    department: string;
    public_view: {
        problem: string;
        solution_narrative: string;
        value_proposition: string;
        roi_estimate: string;
        detailed_explanation?: string; // New field
        example_scenario?: string;     // New field
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
            roi_estimate: "10-15 hours/month saved",
            detailed_explanation: "This workflow acts as a virtual layer between you and the tedious task. Using extraction AI, it turns messy inputs (emails, voice notes, screenshots) into structured data and pushes it exactly where it needs to go.",
            example_scenario: `You forward a client email about "${painPoint}" to 'assistant@dewpoint.ai'. Within seconds, the system parses the request, updates your database, schedules the necessary follow-up, and sends you a Slack confirmation.`
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
                roi_estimate: "$2k - $10k recovered annually",
                detailed_explanation: "This system sits on top of your accounts payable workflow. It uses OCR to 'read' every line item of every invoice and cross-references it with your approved vendor contracts and purchase orders.",
                example_scenario: "A vendor submits an invoice for $5,000, which is 10% higher than the agreed rate. The Watchdog instantly flags this variance, pauses the payment in Xero, and drafts an email to the vendor asking for clarification."
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
                roi_estimate: "5 hours/month saved",
                detailed_explanation: "By connecting to both your email server and your bank feed, this agent acts as a matchmaker. It identifies transaction pairs that humans often miss due to date discrepancies or vendor name variations.",
                example_scenario: "An employee spends $50 at a client lunch. They snap a photo of the receipt. The system matches it to the Amex charge, categorizes it as 'Meals & Entertainment', and appends the image to the transaction record."
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
                roi_estimate: "$50k net new revenue/qtr",
                detailed_explanation: "Speed to lead is everything. This workflow eliminates the research phase for your SDRs. It aggregates data from LinkedIn, news sources, and company websites to create a comprehensive dossier and a tailored outreach message.",
                example_scenario: "A VP from a target account visits your site. The system identifies them, pulls their recent LinkedIn posts, and drafts an email referencing their latest keynote speech, ready for your rep to hit 'Send'."
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
                roi_estimate: "10 hours/week saved",
                detailed_explanation: "This agent acts as your first line of defense. It takes the limited info from a contact form (name, email, website) and enriches it with public data to determine if the lead fits your Ideal Customer Profile (ICP).",
                example_scenario: "A lead submits a form with a Gmail address. The system finds their LinkedIn, sees they are a college student, scores them as 'Low Priority', and sends a polite automated denial email with links to free resources."
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
            roi_estimate: "Invaluable client goodwill",
            detailed_explanation: "Transparency builds trust. This workflow connects your internal project management tools (Jira, Trello, GitHub) with your external client communications, translating technical jargon into clear business progress updates.",
            example_scenario: "Your dev team closes 5 tickets in Jira. The system summarizes this as 'Completed Backend API Integration', updates the client's Notion portal, and posts a weekly summary to the #client-updates Slack channel."
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
                roi_estimate: "Reduces research time by 80%",
                detailed_explanation: "This 'Knowledge Graph' ingests your unstructured data (PDFs, Word Docs, Emails), chunks it into searchable segments, and allows you to chat with your firm's collective brain.",
                example_scenario: "A junior associate needs to find a precedent for a specific contract clause. Instead of emailing partners, they ask the Case Miner, which instantly surfaces 3 relevant cases from 2018, 2021, and 2023."
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
                roi_estimate: "Strategic agility",
                detailed_explanation: "This is automated competitive intelligence. It tracks changes in DOM elements on competitor sites (pricing changes, new headers) and semantic shifts in their job postings to predict their next move.",
                example_scenario: "Competitor X changes their H1 tag to focus on 'Enterprise'. The Watchtower notes this pivot, correlates it with 3 new 'Enterprise Sales' job postings, and alerts you that they are moving up-market."
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
