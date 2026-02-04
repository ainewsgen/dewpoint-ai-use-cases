import { useState } from 'react';
import { Activity, Play, Terminal, AlertTriangle, CheckCircle, XCircle, ChevronRight, ChevronDown } from 'lucide-react';

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
            setTrace(prev => [...prev, { step: "Network/Client Error", details: err.message }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="admin-page-header">
                <h3 className="admin-page-title">
                    <Terminal size={24} className="text-accent" /> AI Debugger
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>Trace request execution, inspect system prompts, and identify failure points.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* LEFT: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={18} /> Test Context
                        </h4>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label className="admin-label">Industry</label>
                                <input type="text" className="admin-input" value={requestData.industry} onChange={e => setRequestData({ ...requestData, industry: e.target.value })} />
                            </div>
                            <div>
                                <label className="admin-label">Role</label>
                                <input type="text" className="admin-input" value={requestData.role} onChange={e => setRequestData({ ...requestData, role: e.target.value })} />
                            </div>
                            <div>
                                <label className="admin-label">Pain Point</label>
                                <input type="text" className="admin-input" value={requestData.painPoint} onChange={e => setRequestData({ ...requestData, painPoint: e.target.value })} />
                            </div>
                            <div>
                                <label className="admin-label">System Prompt Override (Optional)</label>
                                <textarea
                                    className="admin-input"
                                    style={{ height: '100px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                                    placeholder="Leave empty to use system default..."
                                    value={systemPrompt}
                                    onChange={e => setSystemPrompt(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleRunDebug}
                                disabled={isLoading}
                                className="btn-primary"
                                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                            >
                                {isLoading ? <Activity className="animate-spin" size={16} /> : <Play size={16} />}
                                Run Diagnostic
                            </button>
                        </div>
                    </div>

                    {/* Result View */}
                    {result && (
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'rgba(0, 255, 0, 0.05)' }}>
                            <h4 style={{ color: 'hsl(140, 70%, 40%)', display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <CheckCircle size={18} /> Generation Success
                            </h4>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                                <pre style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#eee' }}>
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid salmon', background: 'rgba(255, 0, 0, 0.05)' }}>
                            <h4 style={{ color: 'salmon', display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <XCircle size={18} /> Generation Failed
                            </h4>
                            <p style={{ color: 'salmon' }}>{error}</p>
                        </div>
                    )}

                </div>

                {/* RIGHT: Trace Log */}
                <div className="glass-panel" style={{ padding: '0', borderRadius: '12px', border: '1px solid var(--border-glass)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-glass)' }}>
                        <h4>Execution Trace</h4>
                    </div>

                    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', minHeight: '500px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {trace.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                                Run a diagnostic to view logs.
                            </div>
                        ) : (
                            trace.map((step, idx) => (
                                <div key={idx} style={{ marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                    <div
                                        onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: step.message?.includes('Error') ? 'salmon' : 'inherit' }}
                                    >
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{step.timestamp.split('T')[1].split('.')[0]}</span>
                                        {step.details ? (expandedStep === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }}></span>}
                                        <span style={{ fontWeight: 500 }}>{step.step}</span>
                                    </div>

                                    {expandedStep === idx && step.details && (
                                        <div style={{ marginTop: '0.5rem', marginLeft: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>
                                            <pre style={{ margin: 0, color: '#aaa', fontSize: '0.75rem' }}>
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
    );
}
