
import { useState } from 'react';
import { Opportunity } from '../lib/engine';
import { Frown, Sparkles, Trash2, ArrowRight, Server } from 'lucide-react';

interface RoadmapCardProps {
    opp: Opportunity;
    onRemove?: () => void;
    onSave?: () => void; // Added for Library "Save" action
    isAdmin: boolean;
    readonly?: boolean; // For display only
    isReference?: boolean; // Changes button to "Add to Library" or similar
}

export function RoadmapCard({ opp, onRemove, onSave, isAdmin, readonly, isReference }: RoadmapCardProps) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="glass-panel recipe-card animate-fade-in" style={{ borderTopColor: 'hsl(var(--accent-secondary))', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className={`badge ${opp.public_view.roi_estimate.includes('$') ? 'cost' : 'eff'}`}>{opp.department}</span>
                <span style={{ color: 'hsl(var(--accent-gold))', fontSize: '0.8rem', fontWeight: 700 }}>{opp.public_view.roi_estimate}</span>
            </div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{opp.title}</h3>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Frown size={16} style={{ color: 'salmon', minWidth: '16px', marginTop: '4px' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{opp.public_view.problem}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Sparkles size={16} className="text-gold" style={{ minWidth: '16px', marginTop: '4px' }} />
                <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{opp.public_view.solution_narrative}</p>
            </div>

            {/* Deep Dive Content */}
            {showDetails && (
                <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {/* Publicly visible "Technical Workflow" */}
                    <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>How it works:</p>
                        <p style={{ color: 'var(--text-muted)' }}>{opp.admin_view.workflow_steps}</p>
                    </div>

                    {/* New Content Fields */}
                    {opp.public_view.detailed_explanation && (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Deep Dive:</p>
                            <p style={{ color: 'var(--text-muted)' }}>{opp.public_view.detailed_explanation}</p>
                        </div>
                    )}
                    {opp.public_view.example_scenario && (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Example:</p>
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>"{opp.public_view.example_scenario}"</p>
                        </div>
                    )}

                    {/* Step-by-Step Walkthrough */}
                    <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '6px' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'hsl(var(--accent-primary))' }}>Implementation Flow:</p>
                        <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', margin: 0 }}>
                            {(opp.public_view.walkthrough_steps || [
                                "Conduct initial data audit and security review.",
                                "Configure API connectors for target platforms.",
                                "Implement logic workflows and error handling.",
                                "Run validation tests with sample data.",
                                "Deploy to production and monitor performance."
                            ]).map((step, i) => (
                                <li key={i} style={{ marginBottom: '0.4rem' }}>{step}</li>
                            ))}
                        </ol>
                    </div>

                    {/* Admin Only Stack */}
                    {isAdmin && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.5rem' }}>
                            <div style={{ width: '100%', color: 'salmon', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server size={12} /> Admin Stack View</div>
                            {opp.admin_view.tech_stack.map((t, idx) => (
                                <span key={idx} className="chip active" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>{t}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative', zIndex: 10 }}
                >
                    {showDetails ? 'Hide Specs' : 'View Specs'} <ArrowRight size={14} />
                </button>

                {/* Action Buttons */}
                {!readonly && onRemove && (
                    <button
                        onClick={onRemove}
                        className="btn-secondary"
                        style={{ borderColor: 'salmon', color: 'salmon', padding: '0.5rem' }}
                        title="Remove"
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                {!readonly && onSave && (
                    <button
                        onClick={onSave}
                        className="btn-primary"
                        style={{ padding: '0.5rem' }}
                        title="Save to Library"
                    >
                        Save
                    </button>
                )}

                {/* Reference Mode (e.g. Add to My Roadmap) */}
                {isReference && (
                    <button
                        className="btn-primary"
                        style={{ padding: '0.5rem', opacity: 0.5, cursor: 'not-allowed' }}
                        title="Add to Roadmap (Coming Soon)"
                    >
                        + Add
                    </button>
                )}
            </div>
        </div>
    );
}
