import { useState, useEffect } from 'react';
import { Trash, Search, RefreshCw, Zap, Sparkles, X, Server } from 'lucide-react';
import { Opportunity } from '../../lib/engine';
import { RoadmapCard } from '../RoadmapCard';

interface UseCase {
    id: number;
    industry: string;
    title: string;
    description: string;
    roiEstimate: string;
    difficulty: string;
    tags: string[];
    data?: Opportunity; // Full Recipe
    isPublished?: boolean;
}

export function LibraryManager() {
    const [useCases, setUseCases] = useState<UseCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);


    // AI Generator State
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [isGeneral, setIsGeneral] = useState(false);
    const [genForm, setGenForm] = useState({ industry: '', role: '', painPoint: '' });
    const [isGenerating, setIsGenerating] = useState(false);

    // Effect: Handle General Toggle
    useEffect(() => {
        if (isGeneral) {
            setGenForm(prev => ({ ...prev, industry: 'General', role: 'General Implementation' }));
        } else {
            setGenForm(prev => ({ ...prev, industry: '', role: '' }));
        }
    }, [isGeneral]);
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
                setUseCases(data.useCases || []);
            }
        } catch (error) {
            console.error("Failed to fetch library", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        if (!confirm("This will scan all generated leads and import new use cases into the library. Continue?")) return;
        setIsSyncing(true);
        try {
            const res = await fetch('/api/admin/library/sync', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                alert(data.message || "Sync Complete!");
                fetchUseCases();
            } else {
                alert("Sync failed (Server Error)");
            }
        } catch (e) {
            alert("Sync failed (Network Error)");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setGeneratedOptions([]);
        setHasGenerated(false);

        try {
            const payload = {
                companyData: {
                    industry: genForm.industry,
                    role: genForm.role,
                    painPoint: genForm.painPoint,
                    stack: [] // Optional
                }
            };

            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                console.log("AI Gen Response:", data);
                setGeneratedOptions(data.blueprints || []);
                setHasGenerated(true);
            } else {
                alert("Generation Failed");
            }
        } catch (error) {
            console.error("Gen Error", error);
            alert("Generation Error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveGenerated = async (opp: Opportunity) => {
        try {
            // Save to Library
            const payload = {
                industry: opp.industry || genForm.industry || "General",
                title: opp.title,
                description: opp.public_view.solution_narrative,
                roiEstimate: opp.public_view.roi_estimate,
                difficulty: opp.admin_view.implementation_difficulty,
                tags: opp.admin_view.tech_stack,
                data: opp,
                isPublished: true
            };

            const res = await fetch('/api/admin/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Saved to Library! ✅");
                fetchUseCases();
                // Close modal if desired, or let them save others
            } else {
                alert("Save Failed ❌");
            }
        } catch (e) {
            alert("Save Error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this Use Case?")) return;
        try {
            await fetch(`/api/admin/library/${id}`, { method: 'DELETE' });
            fetchUseCases();
        } catch (error) {
            console.error("Error deleting Use Case", error);
        }
    };

    const handleTogglePublish = async (id: number, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/admin/library/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !currentStatus })
            });
            if (res.ok) {
                setUseCases(prev => prev.map(c => c.id === id ? { ...c, isPublished: !currentStatus } : c));
            }
        } catch (error) {
            console.error("Toggle error", error);
        }
    };

    const handleCleanupAI = async () => {
        if (!confirm("This will delete ALL AI-generated recipe cards from the library. This cannot be undone. Continue?")) return;
        try {
            const res = await fetch('/api/admin/library/cleanup/ai', { method: 'DELETE' });
            if (res.ok) {
                alert("AI-generated cards cleaned up! 🧹");
                fetchUseCases();
            } else {
                alert("Cleanup failed.");
            }
        } catch (e) {
            alert("Cleanup error.");
        }
    };

    // Filter Logic
    const filteredCases = useCases.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Use Case Library</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Manage static examples and generate new content.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleCleanupAI}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'salmon', borderColor: 'salmon' }}
                    >
                        <Trash size={16} /> Cleanup AI
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <RefreshCw size={16} className={isSyncing ? "spin" : ""} />
                        {isSyncing ? "Syncing..." : "Sync from Leads"}
                    </button>
                    <button
                        onClick={() => setIsGeneratorOpen(true)}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none' }}
                    >
                        <Sparkles size={18} /> Generate with AI
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={18} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="Search titles or industries..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                />
            </div>

            {isLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredCases.map(c => (
                        <div key={c.id} style={{ position: 'relative' }}>
                            {/* Render as a RoadmapCard if data exists, else fallback loop */}
                            {c.data ? (
                                <RoadmapCard
                                    opp={c.data}
                                    isAdmin={true}
                                    readonly={false}
                                    isPublished={c.isPublished}
                                    onTogglePublish={() => handleTogglePublish(c.id, !!c.isPublished)}
                                    onRemove={() => handleDelete(c.id)}
                                />
                            ) : (
                                <div className="glass-panel recipe-card" style={{ opacity: c.isPublished ? 1 : 0.7 }}>
                                    <div className="card-header">
                                        <span className="badge eff">{c.industry}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleTogglePublish(c.id, !!c.isPublished)}
                                                style={{ background: 'none', border: 'none', color: c.isPublished ? 'hsl(var(--accent-primary))' : 'var(--text-muted)', cursor: 'pointer' }}
                                            >
                                                {c.isPublished ? <Sparkles size={16} /> : <Server size={16} />}
                                            </button>
                                            <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{c.difficulty}</span>
                                        </div>
                                    </div>
                                    <h3>{c.title}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{c.description}</p>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            style={{ background: 'none', border: 'none', color: 'salmon', cursor: 'pointer' }}
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* AI Generator Modal */}
            {isGeneratorOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
                }}>
                    <div className="glass-panel" style={{ width: '900px', padding: '2rem', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3><Sparkles size={20} style={{ display: 'inline', marginRight: '0.5rem', color: 'gold' }} /> AI Use Case Generator</h3>
                            <button onClick={() => {
                                setIsGeneratorOpen(false);
                                setHasGenerated(false);
                                setGeneratedOptions([]);
                            }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {!hasGenerated ? (
                            <form onSubmit={handleGenerate} style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                                {/* General Switch */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <input
                                        type="checkbox"
                                        id="gen-general"
                                        checked={isGeneral}
                                        onChange={e => setIsGeneral(e.target.checked)}
                                        style={{ width: '1.25rem', height: '1.25rem', accentColor: 'hsl(var(--accent-primary))' }}
                                    />
                                    <label htmlFor="gen-general" style={{ cursor: 'pointer', fontSize: '0.95rem', userSelect: 'none' }}>
                                        Generate <strong>General / Agnostic</strong> Use Cases
                                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                            Creates broad examples applicable to any industry.
                                        </span>
                                    </label>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Target Industry</label>
                                    <input
                                        required
                                        disabled={isGeneral}
                                        className="input-field"
                                        value={genForm.industry}
                                        onChange={e => setGenForm({ ...genForm, industry: e.target.value })}
                                        placeholder="e.g. Legal, Healthcare, Construction"
                                        style={{ opacity: isGeneral ? 0.5 : 1 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Target Role</label>
                                    <input
                                        required
                                        disabled={isGeneral}
                                        className="input-field"
                                        value={genForm.role}
                                        onChange={e => setGenForm({ ...genForm, role: e.target.value })}
                                        placeholder="e.g. Partner, Project Manager, CFO"
                                        style={{ opacity: isGeneral ? 0.5 : 1 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Focus Pain Point</label>
                                    <textarea
                                        required
                                        className="input-field"
                                        rows={3}
                                        value={genForm.painPoint}
                                        onChange={e => setGenForm({ ...genForm, painPoint: e.target.value })}
                                        placeholder="e.g. Too much time spent reviewing contracts manually."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="btn-primary"
                                    style={{ marginTop: '1rem', justifyContent: 'center' }}
                                >
                                    {isGenerating ? <><Zap className="spin" size={16} /> Generating Ideas...</> : 'Generate Blueprints'}
                                </button>
                            </form>
                        ) : (
                            <div className="animate-fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>Generated {generatedOptions.length} potential use cases. Review and save the best ones.</p>
                                    <button onClick={() => setHasGenerated(false)} className="btn-secondary">
                                        <RefreshCw size={14} style={{ marginRight: '0.5rem' }} /> Try Again
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    {generatedOptions.map((opp, idx) => (
                                        <RoadmapCard
                                            key={idx}
                                            opp={opp}
                                            isAdmin={true}
                                            onSave={() => handleSaveGenerated(opp)}
                                            isReference={false}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
