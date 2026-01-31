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

// ... (interfaces)
export interface Opportunity {
    title: string;
    department: string;
    public_view: {
        problem: string;
        solution_narrative: string;
        value_proposition: string;
        roi_estimate: string;
        detailed_explanation?: string;
        example_scenario?: string;
        walkthrough_steps?: string[]; // New: Detailed Step-by-Step
    };
    admin_view: {
        tech_stack: string[]; // Keep for legacy simple view
        stack_details?: { tool: string; role: string }[]; // New: Detailed Stack View
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
            example_scenario: `You forward a client email about "${painPoint}" to 'assistant@dewpoint.ai'. Within seconds, the system parses the request, updates your database, schedules the necessary follow-up, and sends you a Slack confirmation.`,
            walkthrough_steps: [
                "User forwards an email or voice note to the dedicated Agent address.",
                "System performs Entity Extraction to identify key dates, people, and intent.",
                "Agent checks calendar/database availability via API.",
                "Agent performs the action (updates record, sends invite, creates file).",
                "Confirmation summary sent back to User's preferred channel (Slack/Teams/Email)."
            ]
        },
        admin_view: {
            tech_stack: ["Antigravity", stack[0] || 'Email API', "OpenAI GPT-4o"],
            stack_details: [
                { tool: "Antigravity", role: "Orchestration Layer" },
                { tool: stack[0] || "Email API", role: "Input Trigger Source" },
                { tool: "OpenAI GPT-4o", role: "Entity Extraction & Intent Parsing" }
            ],
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
                example_scenario: "A vendor submits an invoice for $5,000, which is 10% higher than the agreed rate. The Watchdog instantly flags this variance, pauses the payment in Xero, and drafts an email to the vendor asking for clarification.",
                walkthrough_steps: [
                    "Vendor emails PDF invoice to billing@company.com.",
                    "System triggers; OCR extracts Vendor Name, Line Items, and Total.",
                    "Agent fetches 'Approved Rates' for this vendor from Database.",
                    "Logic Check: Is New Price > Approved Rate? Is Invoice Duplicate?",
                    "If Issue Found: Draft email to Vendor & alert Finance Manager.",
                    "If Clean: Push to Xero/Quickbooks as 'Draft Bill' ready for 1-click approval."
                ]
            },
            admin_view: {
                tech_stack: ["Antigravity", financeTool, "Azure Document Intelligence"],
                stack_details: [
                    { tool: "Antigravity", role: "Logic Controller" },
                    { tool: financeTool, role: "Accounting Ledger (Destination)" },
                    { tool: "Azure Document Intelligence", role: "Optical Character Recognition (OCR)" }
                ],
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
                example_scenario: "An employee spends $50 at a client lunch. They snap a photo of the receipt. The system matches it to the Amex charge, categorizes it as 'Meals & Entertainment', and appends the image to the transaction record.",
                walkthrough_steps: [
                    "Employee snaps photo of receipt or forwards email receipt.",
                    "Agent extracts Date, Amount, Merchant, and Tax.",
                    "Agent scans Bank Feed / Credit Card feed for matching transaction (+/- 2 days).",
                    "Match Found: Attaches receipt image to Bank Record & Auto-Categorizes.",
                    "Match Missing: Adds to 'Pending Receipts' queue and nags employee weekly."
                ]
            },
            admin_view: {
                tech_stack: ["Antigravity", "Gmail API", "Table Extractor"],
                stack_details: [
                    { tool: "Antigravity", role: "Orchestration" },
                    { tool: "Gmail API", role: "Receipt Ingestion" },
                    { tool: "Table Extractor", role: "Data Parsing" }
                ],
                implementation_difficulty: "Low",
                workflow_steps: "1. Monitor inbox for 'receipt' 2. Extract Merchant/Date/Amount 3. Match roughly with bank feed CSV.",
                upsell_opportunity: "Implementation fee only."
            }
        });
    }

    // 3. RECIPE: The Synthesizer (Growth/Sales)
    const dataTool = stack.find(s => ['Salesforce', 'HubSpot', 'Pipedrive', 'Airtable', 'Notion'].includes(s)) || "Data Source";
    if (dataTool) {
        opportunities.push({
            title: "The Omni-Channel Nurture",
            department: "Sales",
            public_view: {
                problem: "Leads go cold because manual follow-up is too slow or generic.",
                solution_narrative: "When a high-value prospect visits your pricing page, this agent instantly researches them and drafts a hyper-personalized video script and email for your rep to approve.",
                value_proposition: "Increases response rates by 300%.",
                roi_estimate: "$50k net new revenue/qtr",
                detailed_explanation: "Speed to lead is everything. This workflow eliminates the research phase for your SDRs. It aggregates data from LinkedIn, news sources, and company websites to create a comprehensive dossier and a tailored outreach message.",
                example_scenario: "A VP from a target account visits your site. The system identifies them, pulls their recent LinkedIn posts, and drafts an email referencing their latest keynote speech, ready for your rep to hit 'Send'.",
                walkthrough_steps: [
                    "Trigger: Lead Score > 80 or Visit to Pricing Page.",
                    "Enrichment: Clearbit/Apollo API pulls Company Size, Funding, Tech Stack.",
                    "Research: Agent searches LinkedIn for Lead's recent posts/articles.",
                    "Synthesis: LLM writes custom opening line connecting their recent post to your value prop.",
                    "Action: Draft created in HubSpot/Salesforce assigned to Rep for review."
                ]
            },
            admin_view: {
                tech_stack: [dataTool, "LinkedIn Scraper", "HeyGen API", "OpenAI"],
                stack_details: [
                    { tool: dataTool, role: "CRM / System of Record" },
                    { tool: "LinkedIn Scraper", role: "Lead Research" },
                    { tool: "OpenAI", role: "Copywriting Engine" },
                    { tool: "HeyGen API", role: "Video Personalization (Optional)" }
                ],
                implementation_difficulty: "High",
                workflow_steps: "1. Identify IP via Clearbit 2. Scrape LinkedIn profile 3. Generate personalization via LLM 4. Create Draft in System.",
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
                example_scenario: "A lead submits a form with a Gmail address. The system finds their LinkedIn, sees they are a college student, scores them as 'Low Priority', and sends a polite automated denial email with links to free resources.",
                walkthrough_steps: [
                    "Lead submits Contact Form (Typeform/Webflow).",
                    "Agent searches Company Name & Website to verify industry/size.",
                    "Decision Gate: Is Company > 50 employees? Is Industry 'Target'?",
                    "If YES: Mark as 'Qualified', Notify Sales Head via Slack.",
                    "If NO: Send helpful, automated nurturance sequence (Self-Serve Path)."
                ]
            },
            admin_view: {
                tech_stack: ["Antigravity", "Google Search API", "Browserless.io"],
                stack_details: [
                    { tool: "Antigravity", role: "Logic Flow" },
                    { tool: "Google Search API", role: "Company Verification" },
                    { tool: "Browserless.io", role: "Web Scraping" }
                ],
                implementation_difficulty: "Med",
                workflow_steps: "1. Webhook from Contact Form 2. Search Company Name 3. Scrape 'About Us' 4. Classify 'Good/Bad Fit' 5. Tag in Database.",
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
            example_scenario: "Your dev team closes 5 tickets in Jira. The system summarizes this as 'Completed Backend API Integration', updates the client's Notion portal, and posts a weekly summary to the #client-updates Slack channel.",
            walkthrough_steps: [
                "Scheduled Trigger: Every Friday at 4 PM.",
                "Agent fetches all 'Done' tickets from Jira/Trello for the week.",
                "Agent reads latest Git Commits linked to those tickets.",
                "Summarizer: LLM condenses technical tasks into 'Business Value' bullet points.",
                "Action: Updates Client Portal & Emails Weekly Report to Stakeholders."
            ]
        },
        admin_view: {
            tech_stack: ["Slack API", "Jira API", "Client Portal"],
            stack_details: [
                { tool: "Jira API", role: "Task Source" },
                { tool: "Slack API", role: "Internal Notification" },
                { tool: "Client Portal", role: "External View (Notion/Portal)" }
            ],
            implementation_difficulty: "Med",
            workflow_steps: "1. Ingest daily commits/tickets 2. Summarize progress via LLM 3. Post to Notion/Portal 4. Slack Audit Log.",
            upsell_opportunity: "Portal build-out services."
        }
    });

    // 5. ADVANCED: Data Asset Audit (Dormant Data)
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
                example_scenario: "A junior associate needs to find a precedent for a specific contract clause. Instead of emailing partners, they ask the Case Miner, which instantly surfaces 3 relevant cases from 2018, 2021, and 2023.",
                walkthrough_steps: [
                    "One-Time Ingest: Scrape Folder/SharePoint of old PDFs.",
                    "Processing: OCR -> Chunking -> Vector Embedding.",
                    "User Action: Staff queries 'Non-compete clause for biotech'.",
                    "Retrieval: System finds top 5 relevant document chunks.",
                    "Generation: LLM cites specific clauses and summarizes the precedent."
                ]
            },
            admin_view: {
                tech_stack: ["Antigravity", "Pinecone (Vector DB)", "LangChain"],
                stack_details: [
                    { tool: "Antigravity", role: "Interface" },
                    { tool: "Pinecone", role: "Vector Semantic Database" },
                    { tool: "LangChain", role: "RAG Framework" }
                ],
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
                example_scenario: "Competitor X changes their H1 tag to focus on 'Enterprise'. The Watchtower notes this pivot, correlates it with 3 new 'Enterprise Sales' job postings, and alerts you that they are moving up-market.",
                walkthrough_steps: [
                    "Setup: Input URLs of 5 Core Competitors.",
                    "Daily Job: Scraper visits sites, snapshots DOM.",
                    "Diff Check: Compare visual/text changes vs yesterday.",
                    "Contextualize: If 'Pricing' page changed significantly, flag as High Priority.",
                    "Digest: Send weekly email with screen captures of changes."
                ]
            },
            admin_view: {
                tech_stack: ["Antigravity", "Browserless", "Summarization LLM"],
                stack_details: [
                    { tool: "Browserless", role: "Headless Browser Scraper" },
                    { tool: "Antigravity", role: "Scheduler" },
                    { tool: "Summarization LLM", role: "Insight Generator" }
                ],
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
