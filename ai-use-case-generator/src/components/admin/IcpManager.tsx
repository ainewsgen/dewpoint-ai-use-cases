
import React, { useState, useEffect } from 'react';
import { Search, Edit, RefreshCw, Save, X, Target } from 'lucide-react';

interface IcpRecord {
    id: number;
    industry: string;
    icpType: 'dewpoint' | 'internal';
    icpPersona: string;
    profitScore: number;
    ltvScore: number;
    speedToCloseScore: number;
    overallAttractiveness: string;
    communities?: any;
    techSignals?: string[];
    rowColor?: string;
}

export function IcpManager() {
    const [icps, setIcps] = useState<IcpRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingIcp, setEditingIcp] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Fetch List
    const fetchIcps = async (search = '') => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/icps?search=${search}`);
            const data = await res.json();
            setIcps(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIcps();
    }, []);

    // Helper to calc color based on score
    const getScoreColor = (score: number) => {
        if (score >= 4.5) return 'hsl(140, 70%, 40%)'; // High Green
        if (score >= 3.5) return 'hsl(140, 60%, 30%)';
        if (score >= 2.5) return 'hsl(40, 90%, 50%)'; // Mid Yellow
        return 'hsl(0, 70%, 50%)'; // Low Red
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchIcps(searchTerm);
    };

    const handleSave = async () => {
        if (!editingIcp) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/icps/${editingIcp.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingIcp)
            });
            if (res.ok) {
                alert('Saved successfully');
                setEditingIcp(null);
                fetchIcps(searchTerm);
            }
        } catch (e) {
            alert('Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = async () => {
        if (!editingIcp) return;
        if (!confirm('This will Overwrite all current data for this Industry with new AI results. Are you sure?')) return;

        setIsRegenerating(true);
        try {
            const res = await fetch(`/api/admin/icps/${editingIcp.id}/regenerate`, {
                method: 'POST'
            });
            const json = await res.json();
            if (res.ok) {
                // Merge new data into edit form
                // We need to refetch to get the full object or use the returned partial data carefully
                // For now, let's just close and refresh to be safe
                alert('Regenerated successfully! Please review the new values.');
                setEditingIcp(null);
                fetchIcps(searchTerm);
            } else {
                alert('Regeneration failed: ' + json.error);
            }
        } catch (e) {
            alert('Regeneration failed');
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">
                        <Target size={28} className="text-accent" />
                        ICP Intelligence
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginLeft: '2.5rem' }}>Manage GTM strategies and scoring logic.</p>
                </div>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="input-with-icon">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search industries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-input" // Use new class but keep search icon padding override if needed
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                    <button type="submit" className="btn-secondary">Search</button>
                    <button type="button" onClick={() => { setSearchTerm(''); fetchIcps(''); }} className="btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </form>
            </div>

            {/* List View */}
            <div className="admin-panel">
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Industry</th>
                                <th>Target Persona</th>
                                <th style={{ textAlign: 'center' }}>Attractiveness</th>
                                <th style={{ textAlign: 'center' }}>Scores (P/L/S)</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading intelligence data...</td></tr>
                            ) : icps.map(icp => (
                                <tr key={icp.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{icp.industry}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            {icp.icpType === 'dewpoint' ? (
                                                <span className="status-badge info">B2B (Business Owner)</span>
                                            ) : (
                                                <span className="status-badge warning">B2C (End Customer)</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '300px' }}>
                                        <div className="truncate-2" style={{ lineHeight: '1.4' }}>{icp.icpPersona}</div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '12px',
                                            background: getScoreColor(parseFloat(icp.overallAttractiveness)),
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>
                                            {icp.overallAttractiveness}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                        {icp.profitScore} / {icp.ltvScore} / {icp.speedToCloseScore}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => setEditingIcp(icp)} className="btn-secondary btn-sm" style={{ borderColor: 'var(--border-glass)' }}>
                                            <Edit size={14} /> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && icps.length === 0 && (
                                <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found. Run a seed script or check DB.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingIcp && (
                <div className="admin-modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div className="admin-modal-content animate-scale-in" style={{ width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="admin-modal-header">
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Edit Strategy: {editingIcp.industry}</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {editingIcp.id} • Type: {editingIcp.icpType}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={handleRegenerate}
                                    disabled={isRegenerating}
                                    className="btn-ghost"
                                    style={{ color: 'hsl(var(--accent-primary))', borderColor: 'hsl(var(--accent-primary))', border: '1px solid' }}
                                >
                                    {isRegenerating ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />}
                                    {isRegenerating ? ' Regenerating...' : ' AI Re-roll'}
                                </button>
                                <button onClick={() => setEditingIcp(null)} className="btn-ghost" style={{ color: 'var(--text-muted)' }}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="admin-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                            {/* Left Col: Core Strategy */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h4 style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Core Identity</h4>

                                <div className="admin-form-group">
                                    <label className="admin-label">Target Persona</label>
                                    <textarea
                                        value={editingIcp.icpPersona || ''}
                                        onChange={e => setEditingIcp({ ...editingIcp, icpPersona: e.target.value })}
                                        className="admin-textarea"
                                        style={{ minHeight: '80px' }}
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-label">Prompt Instructions</label>
                                    <textarea
                                        value={editingIcp.promptInstructions || ''}
                                        onChange={e => setEditingIcp({ ...editingIcp, promptInstructions: e.target.value })}
                                        className="admin-textarea"
                                        style={{ minHeight: '100px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Profit (1-5)</label>
                                        <input
                                            type="number" min="1" max="5"
                                            value={editingIcp.profitScore || 0}
                                            onChange={e => setEditingIcp({ ...editingIcp, profitScore: parseInt(e.target.value) })}
                                            className="admin-input"
                                        />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-label">LTV (1-5)</label>
                                        <input
                                            type="number" min="1" max="5"
                                            value={editingIcp.ltvScore || 0}
                                            onChange={e => setEditingIcp({ ...editingIcp, ltvScore: parseInt(e.target.value) })}
                                            className="admin-input"
                                        />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Speed (1-5)</label>
                                        <input
                                            type="number" min="1" max="5"
                                            value={editingIcp.speedToCloseScore || 0}
                                            onChange={e => setEditingIcp({ ...editingIcp, speedToCloseScore: parseInt(e.target.value) })}
                                            className="admin-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: Details JSON */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h4 style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Extended Data</h4>

                                <div className="admin-form-group">
                                    <label className="admin-label">Tech Signals (Comma Separated)</label>
                                    <textarea
                                        value={Array.isArray(editingIcp.techSignals) ? editingIcp.techSignals.join(', ') : (editingIcp.techSignals || '')}
                                        onChange={e => setEditingIcp({ ...editingIcp, techSignals: e.target.value.split(',').map((s: string) => s.trim()) })}
                                        placeholder="Salesforce, HubSpot, Jira..."
                                        className="admin-textarea"
                                        style={{ minHeight: '60px' }}
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-label">Communities (JSON)</label>
                                    <textarea
                                        value={typeof editingIcp.communities === 'string' ? editingIcp.communities : JSON.stringify(editingIcp.communities, null, 2)}
                                        onChange={e => {
                                            try {
                                                const parsed = JSON.parse(e.target.value);
                                                setEditingIcp({ ...editingIcp, communities: parsed });
                                            } catch (err) {
                                                // Allow typing invalid json
                                            }
                                        }}
                                        className="admin-textarea"
                                        style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="admin-modal-footer">
                            <button onClick={() => setEditingIcp(null)} className="btn-secondary">Cancel</button>
                            <button onClick={handleSave} disabled={isSaving} className="btn-primary">
                                {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
