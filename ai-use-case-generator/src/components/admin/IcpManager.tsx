
import React, { useState, useEffect } from 'react';
import { Search, Edit, RefreshCw, Save, CheckCircle, X, ChevronRight, ChevronDown, List, Target } from 'lucide-react';

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
        <div className="animate-fade-in" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>ICP Intelligence</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage GTM strategies and scoring logic.</p>
                </div>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="input-with-icon">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search industries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.2)' }}
                        />
                    </div>
                    <button type="submit" className="btn-secondary">Search</button>
                    <button type="button" onClick={() => { setSearchTerm(''); fetchIcps(''); }} className="btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </form>
            </div>

            {/* List View */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Industry</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Target Persona</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Attractiveness</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Scores (P/L/S)</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
                        ) : icps.map(icp => (
                            <tr key={icp.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }} className="hover-row">
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 600 }}>{icp.industry}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        {icp.icpType === 'dewpoint' ? (
                                            <span style={{ background: 'hsla(var(--accent-primary)/0.2)', color: 'hsl(var(--accent-primary))', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                B2B (Business Owner)
                                            </span>
                                        ) : (
                                            <span style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                B2C (End Customer)
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', maxWidth: '300px' }}>
                                    <div className="truncate-2">{icp.icpPersona}</div>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        background: getScoreColor(parseFloat(icp.overallAttractiveness)),
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem'
                                    }}>
                                        {icp.overallAttractiveness}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                    {icp.profitScore} / {icp.ltvScore} / {icp.speedToCloseScore}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <button onClick={() => setEditingIcp(icp)} className="btn-secondary btn-sm">
                                        <Edit size={14} /> Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && icps.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found. Run a seed script or check DB.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingIcp && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div className="glass-panel animate-scale-in" style={{ width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem' }}>Edit Strategy: {editingIcp.industry}</h3>
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
                                <button onClick={() => setEditingIcp(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                            {/* Left Col: Core Strategy */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <h4 style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>Core Identity</h4>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Target Persona</label>
                                    <textarea
                                        value={editingIcp.icpPersona || ''}
                                        onChange={e => setEditingIcp({ ...editingIcp, icpPersona: e.target.value })}
                                        style={{ width: '100%', minHeight: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '0.75rem', borderRadius: '6px', color: 'white' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Prompt Instructions</label>
                                    <textarea
                                        value={editingIcp.promptInstructions || ''}
                                        onChange={e => setEditingIcp({ ...editingIcp, promptInstructions: e.target.value })}
                                        style={{ width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '0.75rem', borderRadius: '6px', color: 'white', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Profit (1-5)</label>
                                        <input
                                            type="number" min="1" max="5"
                                            value={editingIcp.profitScore || 0}
                                            onChange={e => setEditingIcp({ ...editingIcp, profitScore: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>LTV (1-5)</label>
                                        <input
                                            type="number" min="1" max="5"
                                            value={editingIcp.ltvScore || 0}
                                            onChange={e => setEditingIcp({ ...editingIcp, ltvScore: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Speed (1-5)</label>
                                        <input
                                            type="number" min="1" max="5"
                                            value={editingIcp.speedToCloseScore || 0}
                                            onChange={e => setEditingIcp({ ...editingIcp, speedToCloseScore: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', color: 'white' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: Details JSON */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <h4 style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>Extended Data</h4>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Tech Signals (Array)</label>
                                    <textarea
                                        value={Array.isArray(editingIcp.techSignals) ? editingIcp.techSignals.join(', ') : (editingIcp.techSignals || '')}
                                        onChange={e => setEditingIcp({ ...editingIcp, techSignals: e.target.value.split(',').map((s: string) => s.trim()) })}
                                        placeholder="Salesforce, HubSpot, Jira..."
                                        style={{ width: '100%', minHeight: '60px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '0.75rem', borderRadius: '6px', color: 'white' }}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Comma separated values</p>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Communities (JSON)</label>
                                    <textarea
                                        value={typeof editingIcp.communities === 'string' ? editingIcp.communities : JSON.stringify(editingIcp.communities, null, 2)}
                                        onChange={e => {
                                            try {
                                                const parsed = JSON.parse(e.target.value);
                                                setEditingIcp({ ...editingIcp, communities: parsed });
                                            } catch (err) {
                                                // Allow typing invalid json momentarily, or handle better interaction
                                                // For simple crud, we might just store string and parse on save, but here we try strict
                                            }
                                        }}
                                        style={{ width: '100%', minHeight: '150px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '0.75rem', borderRadius: '6px', color: 'white', fontFamily: 'monospace', fontSize: '0.8rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
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
