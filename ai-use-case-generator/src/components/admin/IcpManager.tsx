
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
    const [selectedIcpId, setSelectedIcpId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // We'll manage local edit state for the selected ICP
    const [editForm, setEditForm] = useState<IcpRecord | null>(null);

    // Fetch List
    const fetchIcps = async (search = '') => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/icps?search=${search}`);
            const data = await res.json();
            setIcps(data);

            // Auto-select first if none selected
            if (data.length > 0 && !selectedIcpId) {
                setSelectedIcpId(data[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIcps();
    }, []);

    // Sync editForm with selected ICP
    useEffect(() => {
        if (selectedIcpId) {
            const icp = icps.find(i => i.id === selectedIcpId);
            if (icp) {
                setEditForm({ ...icp });
            }
        } else {
            setEditForm(null);
        }
    }, [selectedIcpId, icps]);

    const getScoreColor = (score: number) => {
        if (score >= 4.5) return 'hsl(140, 70%, 40%)';
        if (score >= 3.5) return 'hsl(140, 60%, 30%)';
        if (score >= 2.5) return 'hsl(40, 90%, 50%)';
        return 'hsl(0, 70%, 50%)';
    };

    const handleSave = async () => {
        if (!editForm) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/icps/${editForm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                alert('Saved successfully');
                fetchIcps(searchTerm);
            }
        } catch (e) {
            alert('Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = async () => {
        if (!editForm) return;
        if (!confirm('This will Overwrite all current data for this Industry with new AI results. Are you sure?')) return;

        setIsRegenerating(true);
        try {
            const res = await fetch(`/api/admin/icps/${editForm.id}/regenerate`, {
                method: 'POST'
            });
            const json = await res.json();
            if (res.ok) {
                alert('Regenerated successfully! Please review the new values.');
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

    const filteredIcps = icps.filter(i =>
        i.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
            {/* Sidebar List */}
            <div className="admin-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-glass)' }}>
                    <div className="input-with-icon">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Filter industries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-input"
                            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {isLoading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                            <RefreshCw className="animate-spin" size={20} style={{ margin: '0 auto' }} />
                        </div>
                    ) : (
                        filteredIcps.map(icp => (
                            <div
                                key={icp.id}
                                onClick={() => setSelectedIcpId(icp.id)}
                                style={{
                                    padding: '1rem 1.25rem',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: selectedIcpId === icp.id ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    borderLeft: selectedIcpId === icp.id ? '3px solid hsl(var(--accent-primary))' : '3px solid transparent'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: selectedIcpId === icp.id ? 'hsl(var(--accent-primary))' : 'inherit' }}>
                                        {icp.industry}
                                    </span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: getScoreColor(parseFloat(icp.overallAttractiveness))
                                    }}>
                                        {icp.overallAttractiveness}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                                    {icp.icpType === 'dewpoint' ? 'B2B' : 'B2C'} • {icp.profitScore}/{icp.ltvScore}/{icp.speedToCloseScore}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Detail Panel */}
            <div className="admin-panel animate-fade-in" style={{ padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {editForm ? (
                    <div style={{ maxWidth: '900px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{editForm.industry}</h3>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID: {editForm.id}</span>
                                    <span className={`status-badge ${editForm.icpType === 'dewpoint' ? 'info' : 'warning'}`}>
                                        {editForm.icpType === 'dewpoint' ? 'B2B Profile' : 'B2C Profile'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={handleRegenerate}
                                    disabled={isRegenerating}
                                    className="btn-secondary"
                                    style={{ color: 'hsl(var(--accent-primary))', borderColor: 'hsla(var(--accent-primary)/0.3)' }}
                                >
                                    {isRegenerating ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                    AI Re-roll
                                </button>
                                <button onClick={handleSave} disabled={isSaving} className="btn-primary">
                                    <Save size={18} /> {isSaving ? 'Saving...' : 'Save Strategy'}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem' }}>
                            {/* Strategy Data */}
                            <div style={{ display: 'grid', gap: '2rem' }}>
                                <div className="admin-form-group">
                                    <label className="admin-label">Target Persona / ICP Narrative</label>
                                    <textarea
                                        value={editForm.icpPersona || ''}
                                        onChange={e => setEditForm({ ...editForm, icpPersona: e.target.value })}
                                        className="admin-textarea"
                                        style={{ minHeight: '120px', lineHeight: '1.6' }}
                                    />
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                                        GTM Scoring (1-5)
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                        <div className="admin-form-group">
                                            <label className="admin-label">Profitability</label>
                                            <input
                                                type="number" min="1" max="5" step="1"
                                                value={editForm.profitScore || 0}
                                                onChange={e => setEditForm({ ...editForm, profitScore: parseInt(e.target.value) })}
                                                className="admin-input"
                                            />
                                        </div>
                                        <div className="admin-form-group">
                                            <label className="admin-label">Avg. LTV</label>
                                            <input
                                                type="number" min="1" max="5" step="1"
                                                value={editForm.ltvScore || 0}
                                                onChange={e => setEditForm({ ...editForm, ltvScore: parseInt(e.target.value) })}
                                                className="admin-input"
                                            />
                                        </div>
                                        <div className="admin-form-group">
                                            <label className="admin-label">Speed to Close</label>
                                            <input
                                                type="number" min="1" max="5" step="1"
                                                value={editForm.speedToCloseScore || 0}
                                                onChange={e => setEditForm({ ...editForm, speedToCloseScore: parseInt(e.target.value) })}
                                                className="admin-input"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-label">Specific AI Prompt Instructions</label>
                                    <textarea
                                        value={editForm.promptInstructions || ''}
                                        onChange={e => setEditForm({ ...editForm, promptInstructions: e.target.value })}
                                        className="admin-textarea"
                                        placeholder="Customize how blueprints are generated for this industry..."
                                        style={{ minHeight: '100px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                                    />
                                </div>
                            </div>

                            {/* Signal Data */}
                            <div style={{ display: 'grid', gap: '2rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                                        Technical Signals
                                    </h4>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Tech Stack Keywords</label>
                                        <textarea
                                            value={Array.isArray(editForm.techSignals) ? editForm.techSignals.join(', ') : (editForm.techSignals || '')}
                                            onChange={e => setEditForm({ ...editForm, techSignals: e.target.value.split(',').map((s: string) => s.trim()) })}
                                            placeholder="e.g. SFDC, Marketo, SAP..."
                                            className="admin-textarea"
                                            style={{ minHeight: '80px' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                                        Digital Footprint
                                    </h4>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Target Communities / Platforms (JSON)</label>
                                        <textarea
                                            value={typeof editForm.communities === 'string' ? editForm.communities : JSON.stringify(editForm.communities, null, 2)}
                                            onChange={e => {
                                                try {
                                                    const parsed = JSON.parse(e.target.value);
                                                    setEditForm({ ...editForm, communities: parsed });
                                                } catch (err) {
                                                    // Allow invalid JSON during typing
                                                }
                                            }}
                                            className="admin-textarea"
                                            style={{ minHeight: '280px', fontFamily: 'monospace', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <Target size={48} style={{ marginBottom: '1.5rem' }} />
                        <p style={{ fontSize: '1.1rem' }}>Select an Industry to view GTM strategy</p>
                    </div>
                )}
            </div>
        </div>
    );
}
