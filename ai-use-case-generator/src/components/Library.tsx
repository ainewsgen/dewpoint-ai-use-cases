import { useState, useEffect } from 'react';
import { Opportunity } from '../lib/engine';
import { BookOpen, Server, Plus, BadgeCheck, Frown, Sparkles, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';


// Initial fallback data
const DEFAULT_RECIPES: Opportunity[] = [
    {
        title: "The Silent Assistant",
        department: "Operations",
        public_view: {
            problem: "Employee burnout from repetitive data entry tasks.",
            solution_narrative: "An autonomous agent that intercepts email instructions, parses the intent, and updates internal records without human touch.",
            value_proposition: "Eliminates cognitive load and context switching.",
            roi_estimate: "15 hours/month saved",
            detailed_explanation: "Functions as a routing layer for your inbox. Instead of manual data entry, you forward structured or unstructured emails to the agent, which handles the Database/System updates instantly.",
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
            tech_stack: ["Antigravity", "Search API", "Database"],
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
    onSaveRequest: (recipe: Opportunity) => void;
    user: any;
}

export function Library({ isAdmin, onSaveRequest, user }: LibraryProps) {
    const [filter, setFilter] = useState('All');
    const departments = ['All', 'General', 'Finance', 'Sales', 'Operations', 'Marketing'];

    // Save/Load Logic
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);
    const [libRecipes, setLibRecipes] = useState<Opportunity[]>(DEFAULT_RECIPES);

    useEffect(() => {
        // Fetch from Backend
        const fetchLibrary = async () => {
            try {
                const apiBase = '/api';

                // 1. Fetch Static Library
                const staticRes = await fetch(`${apiBase}/library`);
                let staticCases: any[] = [];
                if (staticRes.ok) {
                    const data = await staticRes.json();
                    staticCases = data.useCases || [];
                }

                // 2. Fetch Community Library
                const communityRes = await fetch(`${apiBase}/community-library`);
                let communityCases: Opportunity[] = [];
                if (communityRes.ok) {
                    const data = await communityRes.json();
                    communityCases = data.recipes || [];
                }

                // 3. Map Static to Opportunity
                const formattedStatic: Opportunity[] = staticCases.map(sc => ({
                    id: sc.id,
                    title: sc.title,
                    department: "General",
                    industry: sc.industry,
                    public_view: {
                        problem: sc.description,
                        solution_narrative: sc.description,
                        value_proposition: "Verified Use Case",
                        roi_estimate: sc.roiEstimate,
                        detailed_explanation: sc.description,
                        example_scenario: `Industry: ${sc.industry}. Difficulty: ${sc.difficulty}`,
                        walkthrough_steps: []
                    },
                    admin_view: {
                        tech_stack: sc.tags || [],
                        implementation_difficulty: sc.difficulty as any,
                        workflow_steps: "Refer to documentation.",
                        upsell_opportunity: "Consultation"
                    },
                    generation_metadata: { source: 'System', model: 'Static Library' }
                }));

                // 4. Merge
                const merged = [...DEFAULT_RECIPES];

                formattedStatic.forEach(r => {
                    if (!merged.find(m => m.title === r.title)) merged.push(r);
                });

                communityCases.forEach(r => {
                    if (!merged.find(m => m.title === r.title)) merged.push(r);
                });

                setLibRecipes(merged);
            } catch (err) {
                console.error("Failed to load library", err);
            }
        };
        fetchLibrary();

        // Load saved for toggle status
        const saved = localStorage.getItem('dpg_roadmap');
        if (saved) {
            setSavedRecipes(JSON.parse(saved));
        }

        // Listen for storage changes
        const handleStorageChange = () => {
            const saved = localStorage.getItem('dpg_roadmap');
            if (saved) setSavedRecipes(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('roadmap-updated', handleStorageChange); // Custom event
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('roadmap-updated', handleStorageChange);
        };
    }, []);



    const handleToggleSave = (opp: Opportunity) => {
        onSaveRequest(opp);
        // Optimistic / Prop-driven update logic
        if (user) {
            const exists = savedRecipes.find(r => r.title === opp.title);
            if (exists) {
                setSavedRecipes(savedRecipes.filter(r => r.title !== opp.title));
            } else {
                setSavedRecipes([...savedRecipes, opp]);
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this use case? This cannot be undone.")) return;
        try {
            const token = localStorage.getItem('dpg_auth_token');
            const res = await fetch(`/api/admin/library/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setLibRecipes(prev => prev.filter(r => r.id !== id));
            } else {
                alert("Failed to delete use case. Check console for details.");
            }
        } catch (err) {
            console.error("Failed to delete use case", err);
            alert("Error deleting use case.");
        }
    };

    const filteredRecipes = filter === 'All'
        ? libRecipes
        : libRecipes.filter(r => r.department === filter);

    return (
        <div className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
            <header className="library-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-primary)/0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <BookOpen size={48} className="text-accent" />
                </div>
                <h2 className="text-accent" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Free Library of Use Cases</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Browse our archive of proven automation recipes.</p>
            </header>

            <div className="filter-bar" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                {departments.map(dept => (
                    <button
                        key={dept}
                        onClick={() => setFilter(dept)}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: filter === dept ? 'hsl(var(--accent-primary))' : 'transparent',
                            color: filter === dept ? 'white' : 'var(--text-muted)',
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
                    <LibraryCard
                        key={idx}
                        opp={opp}
                        isAdmin={isAdmin}
                        isSaved={savedRecipes.some(r => r.title === opp.title)}
                        onToggle={() => handleToggleSave(opp)}
                        onDelete={opp.id ? () => handleDelete(opp.id!) : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

function LibraryCard({ opp, isAdmin, isSaved, onToggle, onDelete }: { opp: Opportunity, isAdmin: boolean, isSaved: boolean, onToggle: () => void, onDelete?: () => void }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="glass-panel recipe-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>{opp.department}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                            <span style={{ opacity: 0.5, margin: '0 0.5rem' }}>|</span>
                            Industry: {opp.industry || 'General'}
                        </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', lineHeight: '1.3' }}>{opp.title}</h3>
                </div>
                {/* Save Icon Button */}
                <button
                    onClick={onToggle}
                    style={{
                        background: isSaved ? 'hsl(var(--accent-gold))' : 'rgba(0,0,0,0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        color: isSaved ? 'white' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                        marginLeft: '0.5rem'
                    }}
                    title={isSaved ? "Saved to Roadmap" : "Add to Roadmap"}
                >
                    {isSaved ? <BadgeCheck size={18} /> : <Plus size={18} />}
                </button>

                {/* Admin Delete Button */}
                {isAdmin && onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        style={{
                            background: 'rgba(255, 99, 71, 0.1)',
                            border: '1px solid rgba(255, 99, 71, 0.2)',
                            borderRadius: '50%',
                            width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'tomato',
                            transition: 'all 0.2s',
                            marginLeft: '0.5rem'
                        }}
                        title="Delete Use Case"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="badge rev" style={{ background: 'hsla(var(--accent-gold)/0.1)', color: 'hsl(var(--accent-primary))', border: '1px solid hsla(var(--accent-gold)/0.2)', fontSize: '0.8rem' }}>
                    💰 {opp.public_view.roi_estimate}
                </span>
            </div>

            <div style={{ marginBottom: '1.5rem', minHeight: '80px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <Frown size={14} style={{ color: 'salmon', marginTop: '3px', minWidth: '14px' }} />
                    {opp.public_view.problem}
                </p>
                <p style={{ fontSize: '0.9rem', display: 'flex', gap: '0.5rem' }}>
                    <Sparkles size={14} className="text-gold" style={{ marginTop: '3px', minWidth: '14px' }} />
                    {opp.public_view.solution_narrative}
                </p>
            </div>

            {/* Deep Dive Content (Public + Admin) */}
            {showDetails && (
                <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.02)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid var(--border-glass)' }}>

                    {/* Publicly visible "Technical Workflow" (simplified) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'hsl(var(--accent-primary))' }}>
                            <strong>⚙️ How it works</strong>
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{opp.admin_view.workflow_steps}</p>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'hsl(var(--accent-primary))' }}>
                            <strong>📝 Deep Dive</strong>
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{opp.public_view.detailed_explanation}</p>
                    </div>

                    {/* Admin Only Stack */}
                    {isAdmin && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <Server size={14} style={{ color: 'salmon' }} /> <strong style={{ color: 'salmon' }}>Admin Stack View</strong>
                            </div>
                            <div className="chips-grid" style={{ gap: '0.25rem' }}>
                                {(Array.isArray(opp.admin_view?.tech_stack) ? opp.admin_view.tech_stack : []).map((t: string) => (
                                    <span key={t} style={{ background: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border-glass)' }}>{t}</span>
                                ))}
                            </div>

                            {/* Generation Source Indicator */}
                            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', borderTop: '1px dashed var(--border-glass)', paddingTop: '0.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>Source: <strong>{opp.generation_metadata?.source || 'System'}</strong></span>
                                    {opp.generation_metadata?.source === 'System' && opp.generation_metadata?.fallback_reason && (
                                        <span style={{ color: 'salmon', fontSize: '0.7rem' }}>⚠️ {opp.generation_metadata.fallback_reason}</span>
                                    )}
                                </div>
                                {opp.generation_metadata?.model && (
                                    <span>Model: <strong>{opp.generation_metadata.model}</strong></span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 'auto' }}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(!showDetails);
                    }}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        padding: '0.75rem', fontSize: '1rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    {showDetails ? 'Hide Blueprint' : 'View Blueprint'} {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>
        </div >
    );
}
