import { useState, useEffect } from 'react';
import { Trash, Search, RefreshCw, Zap, Sparkles, X, Save } from 'lucide-react';
import { Opportunity } from '../../lib/engine';

interface UseCase {
    id: number;
    industry: string;
    title: string;
    description: string;
    roiEstimate: string;
    difficulty: string;
    tags: string[];
    data?: Opportunity;
    isPublished?: boolean;
}

export function LibraryManager() {
    const [useCases, setUseCases] = useState<UseCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<UseCase | null>(null);

    // AI Generator State
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [isGeneral, setIsGeneral] = useState(false);
    const [genForm, setGenForm] = useState({ industry: '', role: '', painPoint: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedOptions, setGeneratedOptions] = useState<Opportunity[]>([]);
    const [hasGenerated, setHasGenerated] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUseCases();
    }, []);

    const fetchUseCases = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/library/all');
            if (res.ok) {
                const data = await res.json();
                const list = data.useCases || [];
                setUseCases(list);
                if (list.length > 0 && !selectedId) {
                    setSelectedId(list[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch library", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Sync selected logic
    useEffect(() => {
        if (selectedId) {
            const uc = useCases.find(u => u.id === selectedId);
            if (uc) setEditForm({ ...uc });
        } else {
            setEditForm(null);
        }
    }, [selectedId, useCases]);

    const handleSync = async () => {
        if (!confirm("This will scan all generated leads and import new use cases into the library. Continue?")) return;
        setIsSyncing(true);
        try {
            const res = await fetch('/api/admin/library/sync', { method: 'POST' });
            if (res.ok) {
                alert("Sync Complete!");
                fetchUseCases();
            }
        } catch (e) {
            alert("Sync failed");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setGeneratedOptions([]);
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyData: { ...genForm, stack: [] }
                })
            });
            if (res.ok) {
                const data = await res.json();
                setGeneratedOptions(data.blueprints || []);
                setHasGenerated(true);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveGenerated = async (opp: Opportunity) => {
        try {
            const res = await fetch('/api/admin/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    industry: opp.industry || genForm.industry || "General",
                    title: opp.title,
                    description: opp.public_view.solution_narrative,
                    roiEstimate: opp.public_view.roi_estimate,
                    difficulty: opp.admin_view.implementation_difficulty,
                    tags: opp.admin_view.tech_stack,
                    data: opp,
                    isPublished: false // DEFAULT TO DRAFT for review
                })
            });
            if (res.ok) {
                alert("Saved to Library!");
                fetchUseCases();
            }
        } catch (e) {
            alert("Save Failed");
        }
    };

    const handleUpdate = async () => {
        if (!editForm) return;
        try {
            const res = await fetch(`/api/admin/library/${editForm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                alert("Updated!");
                fetchUseCases();
            }
        } catch (error) {
            alert("Update failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this use case?")) return;
        try {
            await fetch(`/api/admin/library/${id}`, { method: 'DELETE' });
            fetchUseCases();
        } catch (e) { }
    };

    const handleTogglePublish = async (id: number, status: boolean) => {
        try {
            const res = await fetch(`/api/admin/library/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !status })
            });
            if (res.ok) {
                setUseCases(prev => prev.map(c => c.id === id ? { ...c, isPublished: !status } : c));
            }
        } catch (e) { }
    };

    const filteredCases = useCases.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
            {/* Sidebar List */}
            <div className="admin-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', gap: '0.5rem' }}>
                    <div className="input-with-icon" style={{ flex: 1 }}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-input"
                            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                        />
                    </div>
                    <button onClick={() => { setIsGeneratorOpen(true); setHasGenerated(false); }} className="btn-icon" title="Generate with AI" style={{ background: 'hsla(var(--accent-primary)/0.1)', color: 'hsl(var(--accent-primary))' }}>
                        <Sparkles size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {isLoading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                            <RefreshCw className="animate-spin" size={20} style={{ margin: '0 auto' }} />
                        </div>
                    ) : (
                        filteredCases.map(uc => (
                            <div
                                key={uc.id}
                                onClick={() => setSelectedId(uc.id)}
                                style={{
                                    padding: '1rem 1.25rem',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: selectedId === uc.id ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    borderLeft: selectedId === uc.id ? '3px solid hsl(var(--accent-primary))' : '3px solid transparent',
                                    opacity: uc.isPublished ? 1 : 0.5
                                }}
                            >
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', color: selectedId === uc.id ? 'hsl(var(--accent-primary))' : 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {uc.title}
                                    {!uc.isPublished && (
                                        <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 700 }}>DRAFT</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {uc.industry} • {uc.difficulty}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                    <button onClick={handleSync} disabled={isSyncing} className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }}>
                        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? 'Syncing...' : 'Sync from Leads'}
                    </button>
                </div>
            </div>

            {/* Main Detail Panel */}
            <div className="admin-panel animate-fade-in" style={{ padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {editForm ? (
                    <div style={{ maxWidth: '900px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{editForm.title}</h3>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{editForm.industry}</span>
                                    <button
                                        onClick={() => handleTogglePublish(editForm.id, !!editForm.isPublished)}
                                        className={`status-badge ${editForm.isPublished ? 'success' : 'neutral'}`}
                                        style={{ border: 'none', cursor: 'pointer' }}
                                    >
                                        {editForm.isPublished ? 'Published' : 'Draft'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => handleDelete(editForm.id)} className="btn-secondary" style={{ color: 'salmon', borderColor: 'rgba(250,128,114,0.3)' }}>
                                    <Trash size={16} /> Delete
                                </button>
                                <button onClick={handleUpdate} className="btn-primary">
                                    <Save size={18} /> Save Changes
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem' }}>
                            {/* Left: Content */}
                            <div style={{ display: 'grid', gap: '2rem' }}>
                                <div className="admin-form-group">
                                    <label className="admin-label">Blueprint Title</label>
                                    <input
                                        className="admin-input"
                                        value={editForm.title}
                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-label">Description / Solution Narrative</label>
                                    <textarea
                                        className="admin-textarea"
                                        rows={6}
                                        value={editForm.description}
                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="admin-form-group">
                                        <label className="admin-label">ROI Estimate</label>
                                        <input
                                            className="admin-input"
                                            value={editForm.roiEstimate}
                                            onChange={e => setEditForm({ ...editForm, roiEstimate: e.target.value })}
                                        />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Difficulty</label>
                                        <select
                                            className="admin-input"
                                            value={editForm.difficulty}
                                            onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Med">Med</option>
                                            <option value="High">High</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Technical Details */}
                            <div style={{ display: 'grid', gap: '2rem' }}>
                                <div className="admin-form-group">
                                    <label className="admin-label">Industry Classification</label>
                                    <input
                                        className="admin-input"
                                        value={editForm.industry}
                                        onChange={e => setEditForm({ ...editForm, industry: e.target.value })}
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-label">Tech Stack (comma separated)</label>
                                    <textarea
                                        className="admin-textarea"
                                        rows={3}
                                        value={Array.isArray(editForm.tags) ? editForm.tags.join(', ') : (editForm.tags || '')}
                                        onChange={e => setEditForm({ ...editForm, tags: e.target.value.split(',').map(s => s.trim()) })}
                                    />
                                </div>

                                {editForm.data && (
                                    <div>
                                        <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                                            Full Recipe JSON
                                        </h4>
                                        <textarea
                                            className="admin-textarea"
                                            readOnly
                                            style={{ height: '240px', fontFamily: 'monospace', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)' }}
                                            value={JSON.stringify(editForm.data, null, 2)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <Zap size={48} style={{ marginBottom: '1.5rem' }} />
                        <p style={{ fontSize: '1.1rem' }}>Select a Use Case to edit</p>
                    </div>
                )}
            </div>

            {/* AI Generator Modal */}
            {isGeneratorOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000
                }}>
                    <div className="glass-panel" style={{ width: '900px', padding: '2.5rem', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h3><Sparkles size={20} style={{ display: 'inline', marginRight: '0.5rem', color: 'gold' }} /> AI Library Generator</h3>
                            <button onClick={() => setIsGeneratorOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {!hasGenerated ? (
                            <form onSubmit={handleGenerate} style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '12px' }}>
                                    <input
                                        type="checkbox"
                                        id="gen-general"
                                        checked={isGeneral}
                                        onChange={e => setIsGeneral(e.target.checked)}
                                        style={{ width: '1.25rem', height: '1.25rem', accentColor: 'hsl(var(--accent-primary))' }}
                                    />
                                    <label htmlFor="gen-general" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>
                                        Agnostic/General Focus
                                    </label>
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Industry</label>
                                    <input className="admin-input" disabled={isGeneral} value={genForm.industry} onChange={e => setGenForm({ ...genForm, industry: e.target.value })} />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Role</label>
                                    <input className="admin-input" disabled={isGeneral} value={genForm.role} onChange={e => setGenForm({ ...genForm, role: e.target.value })} />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Core Pain Point</label>
                                    <textarea className="admin-textarea" rows={3} value={genForm.painPoint} onChange={e => setGenForm({ ...genForm, painPoint: e.target.value })} />
                                </div>
                                <button type="submit" disabled={isGenerating} className="btn-primary" style={{ justifyContent: 'center', padding: '1rem' }}>
                                    {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                                    {isGenerating ? 'AI is thinking...' : 'Generate Examples'}
                                </button>
                            </form>
                        ) : (
                            <div className="animate-fade-in">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {generatedOptions.map((opp, idx) => (
                                        <div key={idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                            <h4 style={{ marginBottom: '0.75rem' }}>{opp.title}</h4>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1, marginBottom: '1.5rem' }}>{opp.public_view.solution_narrative}</p>
                                            <button onClick={() => handleSaveGenerated(opp)} className="btn-secondary" style={{ width: '100%' }}>
                                                Add to Library
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                    <button onClick={() => setHasGenerated(false)} className="btn-ghost">Try another batch</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
