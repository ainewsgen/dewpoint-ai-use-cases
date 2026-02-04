import { useState } from 'react';
import { Activity, Play, Terminal, CheckCircle, XCircle, ChevronRight, ChevronDown } from 'lucide-react';

export function DebugConsole() {
    const [requestData, setRequestData] = useState({
        industry: 'Topical Analgesics',
        role: 'Marketing Director',
        painPoint: 'Campaign Attribution',
        url: 'https://example.com',
        description: 'Mock data for debug'
    });

    // Config: Prompt override
    const [systemPrompt, setSystemPrompt] = useState<string>('');

    // Output
    const [isLoading, setIsLoading] = useState(false);
    const [trace, setTrace] = useState<any[]>([]);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Expandable Step
    const [expandedStep, setExpandedStep] = useState<number | null>(null);

    const handleRunDebug = async () => {
        setIsLoading(true);
        setTrace([]);
        setResult(null);
        setError(null);

        try {
            const token = localStorage.getItem('dpg_auth_token'); // Assuming token used
            const res = await fetch('/api/admin/generate-debug', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    companyData: requestData,
                    promptDetails: systemPrompt ? { systemPromptOverride: systemPrompt } : undefined
                })
            });

            const data = await res.json();

            // Should always return trace
            if (data.trace) setTrace(data.trace);

            if (data.success) {
                setResult(data.blueprints);
            } else {
                setError(data.error || data.message || "Unknown Failure");
            }

        } catch (err: any) {
            setError(err.message);
            setTrace(prev => [...prev, { timestamp: new Date().toISOString(), step: "Network/Client Error", details: err.message }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-panel animate-fade-in" style={{ padding: '2rem', height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
            <div className="admin-page-header" style={{ marginBottom: '2rem' }}>
                <h3 className="admin-page-title">
                    <Terminal size={24} className="text-accent" /> AI Debugger
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>Trace request execution, inspect system prompts, and identify failure points.</p>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
                {/* Result & Trace Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem', height: '100%' }}>
                    {/* LEFT: Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                            <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                <Activity size={18} /> Test Context
                            </h4>

                            <div style={{ display: 'grid', gap: '1.25rem' }}>
                                <div className="admin-form-group">
                                    <label className="admin-label">Industry</label>
                                    <input type="text" className="admin-input" value={requestData.industry} onChange={e => setRequestData({ ...requestData, industry: e.target.value })} />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Role</label>
                                    <input type="text" className="admin-input" value={requestData.role} onChange={e => setRequestData({ ...requestData, role: e.target.value })} />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Pain Point</label>
                                    <input type="text" className="admin-input" value={requestData.painPoint} onChange={e => setRequestData({ ...requestData, painPoint: e.target.value })} />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">System Prompt Override</label>
                                    <textarea
                                        className="admin-input"
                                        style={{ height: '120px', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.4' }}
                                        placeholder="Leave empty to use system default..."
                                        value={systemPrompt}
                                        onChange={e => setSystemPrompt(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem' }}>
                                <button
                                    onClick={handleRunDebug}
                                    disabled={isLoading}
                                    className="btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
                                >
                                    {isLoading ? <Activity className="animate-spin" size={18} /> : <Play size={18} />}
                                    Run diagnostic
                                </button>
                            </div>
                        </div>

                        {/* Result View (Summary in sidebar) */}
                        {result && (
                            <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid hsla(140, 70%, 50%, 0.3)', background: 'rgba(0, 255, 0, 0.02)' }}>
                                <h4 style={{ color: 'hsl(140, 70%, 45%)', display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem' }}>
                                    <CheckCircle size={18} /> Generation Success
                                </h4>
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <pre style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#eee', margin: 0 }}>
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 69, 58, 0.3)', background: 'rgba(255, 0, 0, 0.02)' }}>
                                <h4 style={{ color: 'salmon', display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem' }}>
                                    <XCircle size={18} /> Generation Failed
                                </h4>
                                <p style={{ color: 'salmon', fontSize: '0.85rem' }}>{error}</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Trace Log (Hero position) */}
                    <div className="glass-panel" style={{ padding: '0', borderRadius: '12px', border: '1px solid var(--border-glass)', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Execution Trace</h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trace.length} steps captured</span>
                        </div>

                        <div className="custom-scrollbar" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                            {trace.length === 0 ? (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                    <Terminal size={48} style={{ marginBottom: '1rem' }} />
                                    <p>Run a diagnostic to view step-by-step logs</p>
                                </div>
                            ) : (
                                trace.map((step, idx) => (
                                    <div key={idx} style={{ marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.75rem' }}>
                                        <div
                                            onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: (step.step || '').includes('Error') ? 'salmon' : 'inherit' }}
                                        >
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', minWidth: '80px' }}>
                                                {step.timestamp ? step.timestamp.split('T')[1].split('.')[0] : ''}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {step.details ? (expandedStep === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }}></span>}
                                                <span style={{ fontWeight: 600, color: expandedStep === idx ? 'hsl(var(--accent-primary))' : 'inherit' }}>{step.step}</span>
                                            </div>
                                        </div>

                                        {expandedStep === idx && step.details && (
                                            <div className="animate-fade-in" style={{ marginTop: '0.75rem', marginLeft: '6rem', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                                                <pre style={{ margin: 0, color: '#ccc', fontSize: '0.8rem', lineHeight: '1.5' }}>
                                                    {typeof step.details === 'string' ? step.details : JSON.stringify(step.details, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
