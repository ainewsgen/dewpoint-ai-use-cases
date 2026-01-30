import { useState } from 'react';
import { CompanyData, Opportunity } from '../lib/engine';
import { Lock, Unlock, Database, Eye } from 'lucide-react';

interface AdminDashboardProps {
    leads: Array<{
        id: string;
        timestamp: string;
        company: CompanyData;
        recipes: Opportunity[];
    }>;
}

export function AdminDashboard({ leads }: AdminDashboardProps) {
    const [selectedLead, setSelectedLead] = useState<string | null>(null);
    const [passcode, setPasscode] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Simple mock auth for demonstration
    const handleLogin = () => {
        if (passcode === 'dewpoint') {
            setIsAuthenticated(true);
        } else {
            alert('Access Denied');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="center-stage animate-fade-in">
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
                    <Lock size={48} className="text-accent" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ marginBottom: '1rem' }}>DewPoint Admin</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Restricted Access</p>
                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <input
                            type="password"
                            placeholder="Enter Passcode..."
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>
                    <button onClick={handleLogin} className="btn-primary" style={{ width: '100%' }}>
                        <Unlock size={18} /> Authenticate
                    </button>
                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>Hint: dewpoint</p>
                </div>
            </div>
        );
    }

    const activeLead = leads.find(l => l.id === selectedLead);

    return (
        <div className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
            <header className="library-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Database size={32} className="text-accent" />
                    <h2 className="text-accent">Lead Capture Database</h2>
                </div>
                <div className="glass-panel" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'hsl(var(--accent-primary))' }}>
                    {leads.length} Blueprints Unlocked
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                {/* Sidebar List */}
                <div className="glass-panel" style={{ padding: '1rem', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Recent Inquires</h3>
                    {leads.length === 0 && <p style={{ color: '#666', fontStyle: 'italic' }}>No leads captured yet.</p>}
                    {leads.map(lead => (
                        <div
                            key={lead.id}
                            onClick={() => setSelectedLead(lead.id)}
                            style={{
                                padding: '1rem',
                                borderBottom: '1px solid var(--border-glass)',
                                cursor: 'pointer',
                                background: selectedLead === lead.id ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                borderRadius: '8px',
                                marginBottom: '0.5rem'
                            }}
                        >
                            <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{lead.company.url || "Unknown Company"}</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.company.role}</p>
                            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>{new Date(lead.timestamp).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>

                {/* Main Detail View */}
                <div className="glass-panel" style={{ padding: '2rem', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    {activeLead ? (
                        <div className="animate-fade-in">
                            <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                                <h1 style={{ marginBottom: '0.5rem' }}>{activeLead.company.url}</h1>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    <span><strong>Role:</strong> {activeLead.company.role}</span>
                                    <span><strong>Size:</strong> {activeLead.company.size}</span>
                                    <span><strong>Pain:</strong> "{activeLead.company.painPoint}"</span>
                                </div>
                            </div>

                            <h3 style={{ marginBottom: '1rem', color: 'hsl(var(--accent-primary))' }}>Generated Blueprints (Admin View)</h3>
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {activeLead.recipes.map((r, idx) => (
                                    <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <h4 style={{ fontSize: '1.1rem' }}>{r.title}</h4>
                                            <span className="badge" style={{ background: '#333' }}>{r.admin_view.implementation_difficulty} Difficulty</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                            <div>
                                                <label style={{ color: '#888', display: 'block', marginBottom: '0.25rem' }}>Tech Stack</label>
                                                <div className="chips-grid" style={{ gap: '0.25rem' }}>
                                                    {r.admin_view.tech_stack.map(t => (
                                                        <span key={t} style={{ background: '#222', padding: '2px 8px', borderRadius: '4px', border: '1px solid #444', fontSize: '0.75rem' }}>{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ color: '#888', display: 'block', marginBottom: '0.25rem' }}>Upsell Opp</label>
                                                <p style={{ color: 'hsl(140, 70%, 50%)' }}>{r.admin_view.upsell_opportunity}</p>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #444' }}>
                                            <label style={{ color: '#888', display: 'block', marginBottom: '0.25rem' }}>Workflow Logic</label>
                                            <code style={{ fontFamily: 'monospace', color: '#ccc', background: '#111', padding: '0.5rem', display: 'block', borderRadius: '4px' }}>
                                                {r.admin_view.workflow_steps}
                                            </code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <Eye size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>Select a lead to view their generated confidential blueprint.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
