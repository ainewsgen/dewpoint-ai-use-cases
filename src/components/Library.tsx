// ... imports
import { useState } from 'react';
import { Opportunity } from '../lib/engine';
import { BookOpen, Server } from 'lucide-react';

// We'll move the recipe data to a shared source in engine.ts soon.
const LIBRARY_RECIPES: Opportunity[] = [
    {
        title: "The Silent Assistant",
        department: "Operations",
        public_view: {
            problem: "Employee burnout from repetitive data entry tasks.",
            solution_narrative: "An autonomous agent that intercepts email instructions, parses the intent, and updates internal records without human touch.",
            value_proposition: "Eliminates cognitive load and context switching.",
            roi_estimate: "15 hours/month saved",
            detailed_explanation: "Functions as a routing layer for your inbox. Instead of manual data entry, you forward structured or unstructured emails to the agent, which handles the CRM/ERP updates instantly.",
            example_scenario: "Forwarding a client email to 'assistant@company.com' automatically updates the Hubspot deal stage and notifies the account manager."
        },
        admin_view: {
            tech_stack: ["Antigravity", "Email API", "OpenAI GPT-4o"],
            implementation_difficulty: "Med",
            workflow_steps: "1. Ingest email 2. Parse JSON 3. Execute DB Update",
            upsell_opportunity: "Monthly maintenance."
        }
    },
    {
        title: "The Invoice Watchdog",
        department: "Finance",
        public_view: {
            problem: "Duplicate invoices and vendor overbilling.",
            solution_narrative: "An always-on auditor that reviews every PDF invoice against contract terms.",
            value_proposition: "Catches overbilling before payment.",
            roi_estimate: "$5k+ recovered annually",
            detailed_explanation: "Uses computer vision (OCR) to extract line items from PDF invoices and matches them against your master service agreements.",
            example_scenario: "Detects a price increase in a monthly SaaS bill that was not pre-approved and flags it for review."
        },
        admin_view: {
            tech_stack: ["Antigravity", "OCR API", "Finance Tool"],
            implementation_difficulty: "High",
            workflow_steps: "1. Ingest PDF 2. OCR 3. Match PO",
            upsell_opportunity: "Revenue share."
        }
    },
    {
        title: "The Lead Qualifier",
        department: "Sales",
        public_view: {
            problem: "Sales team wasting time on unqualified leads.",
            solution_narrative: "An agent that researches every new inquiry on the web and drafts a perfect, personalized reply.",
            value_proposition: "Focus only on 5-star prospects.",
            roi_estimate: "10 hours/week saved",
            detailed_explanation: "Enriches incoming lead data with public information (LinkedIn, Company Website) to score intent and fit before a human ever sees it.",
            example_scenario: "A lead from a 'Student' is auto-rejected with a polite email, while a 'VP' gets a high-priority Calendly link."
        },
        admin_view: {
            tech_stack: ["Antigravity", "Search API", "CRM"],
            implementation_difficulty: "Med",
            workflow_steps: "1. Webhook 2. Scrape Company 3. Score Lead",
            upsell_opportunity: "Scraping credits."
        }
    },
    {
        title: "The Content Engine",
        department: "Marketing",
        public_view: {
            problem: "Inconsistent social media presence.",
            solution_narrative: "An agent that watches industry news and drafts LinkedIn posts in your specific brand voice.",
            value_proposition: "Thought leadership on autopilot.",
            roi_estimate: "30+ posts/month",
            detailed_explanation: "Monitors RSS feeds and Google News for keywords relevant to your industry, then uses your past posts to generate new content in your unique voice.",
            example_scenario: "News breaks about 'AI Regulation'. The engine drafts a thoughtful LinkedIn post comparing it to your previous stance on data privacy."
        },
        admin_view: {
            tech_stack: ["Antigravity", "News API", "LinkedIn API"],
            implementation_difficulty: "Low",
            workflow_steps: "1. Monitor Keywords 2. Summarize 3. Draft Post",
            upsell_opportunity: "Content strategy retainer."
        }
    }
];

interface LibraryProps {
    isAdmin: boolean;
}

export function Library({ isAdmin }: LibraryProps) {
    const [filter, setFilter] = useState('All');
    const departments = ['All', 'Finance', 'Sales', 'Operations', 'Marketing'];

    const filteredRecipes = filter === 'All'
        ? LIBRARY_RECIPES
        : LIBRARY_RECIPES.filter(r => r.department === filter);

    return (
        <div className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
            <header className="library-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-primary)/0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <BookOpen size={48} className="text-accent" />
                </div>
                <h2 className="text-accent" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Use Case Library</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Browse our archive of {LIBRARY_RECIPES.length}+ proved automation recipes.</p>
            </header>

            <div className="filter-bar" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                {departments.map(dept => (
                    <button
                        key={dept}
                        onClick={() => setFilter(dept)}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: filter === dept ? 'hsl(var(--accent-primary))' : 'transparent',
                            color: filter === dept ? 'hsl(var(--bg-dark))' : 'var(--text-muted)',
                            border: `1px solid ${filter === dept ? 'hsl(var(--accent-primary))' : 'var(--border-glass)'}`,
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        {dept}
                    </button>
                ))}
            </div>

            <div className="matrix-grid">
                {filteredRecipes.map((opp, idx) => (
                    <LibraryCard key={idx} opp={opp} isAdmin={isAdmin} />
                ))}
            </div>
        </div>
    );
}

function LibraryCard({ opp, isAdmin }: { opp: Opportunity, isAdmin: boolean }) {
    const [showSpecs, setShowSpecs] = useState(false);

    return (
        <div className="glass-panel recipe-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' }}>{opp.department}</span>
                <span style={{ color: 'hsl(var(--accent-primary))', fontSize: '0.8rem', fontWeight: 600 }}>{opp.public_view.roi_estimate}</span>
            </div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{opp.title}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>{opp.public_view.solution_narrative}</p>

            {showSpecs && (
                <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>How it works:</p>
                        <p style={{ color: 'var(--text-muted)' }}>{opp.admin_view.workflow_steps}</p>
                    </div>

                    {opp.public_view.detailed_explanation && (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Deep Dive:</p>
                            <p style={{ color: 'var(--text-muted)' }}>{opp.public_view.detailed_explanation}</p>
                        </div>
                    )}

                    {/* Admin Only Stack */}
                    {isAdmin && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.5rem' }}>
                            <div style={{ width: '100%', color: 'salmon', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server size={12} /> Admin Stack View</div>
                            {opp.admin_view.tech_stack.map(t => (
                                <span key={t} className="chip active" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>{t}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                <button
                    type="button"
                    onClick={() => setShowSpecs(!showSpecs)}
                    className="btn-secondary"
                    style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', width: '100%', position: 'relative', zIndex: 10 }}
                >
                    {showSpecs ? 'Hide Blueprint' : 'View Blueprint'}
                </button>
            </div>
        </div>
    );
}
