
export class SystemCapabilityService {
    static generateFallback(industry: string, role: string) {
        // Return a generic, high-quality template that works for any industry
        return [
            {
                title: "Automated Inquiry Response System",
                department: "Customer Service/Sales",
                industry: industry || "General",
                public_view: {
                    problem: "Missed calls and delayed email responses lead to lost opportunities and lower customer satisfaction.",
                    solution_narrative: "Implement an intelligent auto-response system that instantly acknowledges inquiries, answers FAQs, and routes complex issues to the right team member.",
                    value_proposition: "Capture 100% of leads 24/7 without increasing headcount.",
                    roi_estimate: "Recapture 15-20% of lost leads; save 10+ hours/week on manual triage.",
                    detailed_explanation: "This system uses rule-based logic to categorize incoming messages. Common queries (hours, pricing, location) are answered immediately. High-value leads are flagged for priority follow-up.",
                    example_scenario: "A customer emails at 8 PM asking for a quote. The system replies instantly with a pricing guide and a link to book a consultation.",
                    walkthrough_steps: [
                        "Audit current inquiry channels (email, phone, form).",
                        "Draft standard responses for top 5 FAQs.",
                        "Configure auto-responder rules in email/CRM.",
                        "Test routing logic with sample inquiries."
                    ]
                },
                admin_view: {
                    tech_stack: ["CRM (HubSpot/Salesforce)", "Email Automation", "Zapier"],
                    implementation_difficulty: "Low",
                    workflow_steps: "Trigger: New Email -> Boolean Check: Is FAQ? -> Yes: Send Template / No: Notify Admin.",
                    upsell_opportunity: "CRM Integration & Custom Workflow Design"
                },
                generation_metadata: {
                    source: "System (Fallback)",
                    model: "static-template-v1",
                    timestamp: new Date().toISOString()
                }
            },
            {
                title: "Client Onboarding Streamline",
                department: "Operations",
                industry: industry || "General",
                public_view: {
                    problem: "Manual onboarding is slow, prone to errors, and creates a poor first impression for new clients.",
                    solution_narrative: "Digitize the onboarding flow with a unified portal or automated email sequence that collects documents, signs contracts, and welcomes the client.",
                    value_proposition: "Reduce onboarding time by 50% and ensure compliance.",
                    roi_estimate: "Save $500+ per client in administrative labor.",
                    detailed_explanation: "Replace paper forms and scattered emails with a structured digital process. Triggers automatically send reminders for missing information.",
                    example_scenario: "New client signs proposal. System automatically sends welcome packet, contract for e-signature, and intake form.",
                    walkthrough_steps: [
                        "Map out the current onboarding checklist.",
                        "Digitize forms using a tool like JotForm or Typeform.",
                        "Set up an email sequence to deliver forms.",
                        "Automate file storage for completed docs."
                    ]
                },
                admin_view: {
                    tech_stack: ["DocuSign/PandaDoc", "Project Management Tool", "Form Builder"],
                    implementation_difficulty: "Med",
                    workflow_steps: "Proposal Signed -> Send Contracts -> Send Intake Forms -> Create Project Folder.",
                    upsell_opportunity: "Full Client Portal Development"
                },
                generation_metadata: {
                    source: "System (Fallback)",
                    model: "static-template-v1",
                    timestamp: new Date().toISOString()
                }
            },
            {
                title: "Review Generation Engine",
                department: "Marketing",
                industry: industry || "General",
                public_view: {
                    problem: "Lack of recent positive reviews hurts local SEO and trust.",
                    solution_narrative: "Automate the request for reviews immediately after a successful service delivery or purchase.",
                    value_proposition: "Boost Google ranking and conversion rates automatically.",
                    roi_estimate: "Increase organic traffic by 10-15% within 3 months.",
                    detailed_explanation: "Trigger an SMS or Email request 24 hours after job completion. Direct satisfied customers to Google/Yelp; intercept unsatisfied ones for feedback.",
                    example_scenario: "Job marked 'Complete' in field app. System waits 24 hours, then texts client: 'How did we do?' with a link.",
                    walkthrough_steps: [
                        "Identify the 'Success Trigger' in your process.",
                        "Draft a polite, low-friction review request.",
                        "Set up the automation trigger.",
                        "Monitor new reviews and respond weekly."
                    ]
                },
                admin_view: {
                    tech_stack: ["SMS Marketing Tool", "Reputation Management Software"],
                    implementation_difficulty: "Low",
                    workflow_steps: "Job Closed -> Wait 24h -> Send Request -> If 5-star, thank; If <4, alert manager.",
                    upsell_opportunity: "Reputation Management Retainer"
                },
                generation_metadata: {
                    source: "System (Fallback)",
                    model: "static-template-v1",
                    timestamp: new Date().toISOString()
                }
            }
        ];
    }
}
