import { useState, useEffect } from 'react';
import { Plus, Trash, Edit, Save, X, Search, Tags, RefreshCw, Zap } from 'lucide-react';

interface UseCase {
    id: number;
    industry: string;
    title: string;
    description: string;
    roiEstimate: string;
    difficulty: string;
    tags: string[];
}

export function LibraryManager() {
    const [useCases, setUseCases] = useState<UseCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCase, setCurrentCase] = useState<Partial<UseCase>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [tagsInput, setTagsInput] = useState('');

    useEffect(() => {
        fetchUseCases();
    }, []);

    const fetchUseCases = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/library'); // Public endpoint returns full list if no filter
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

    const handleSave = async () => {
        try {
            // Process tags
            const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            const payload = { ...currentCase, tags: tagsArray };

            const method = currentCase.id ? 'PUT' : 'POST';
            const url = currentCase.id ? `/api/admin/library/${currentCase.id}` : '/api/admin/library';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsEditing(false);
                setCurrentCase({});
                setTagsInput('');
                fetchUseCases();
            } else {
                alert("Failed to save Use Case");
            }
        } catch (error) {
            console.error("Error saving Use Case", error);
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

    const openEditor = (useCase?: UseCase) => {
        if (useCase) {
            setCurrentCase(useCase);
            setTagsInput(useCase.tags ? useCase.tags.join(', ') : '');
        } else {
            setCurrentCase({ difficulty: 'Med' });
            setTagsInput('');
        }
        setIsEditing(true);
    };

    const filteredCases = useCases.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Use Case Library</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Manage static examples for the public library.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Zap size={16} className={isSyncing ? "spin" : ""} />
                        {isSyncing ? "Syncing..." : "Sync from Leads"}
                    </button>
                    <button
                        onClick={() => openEditor()}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={18} /> Add Use Case
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
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-glass)' }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Industry</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Title</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>ROI</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Difficulty</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCases.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{c.industry}</td>
                                    <td style={{ padding: '1rem' }}>{c.title}</td>
                                    <td style={{ padding: '1rem', color: 'hsl(var(--accent-primary))' }}>{c.roiEstimate}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                            background: c.difficulty === 'High' ? 'rgba(255,99,71,0.2)' :
                                                c.difficulty === 'Low' ? 'rgba(50,205,50,0.2)' : 'rgba(255,255,0,0.1)',
                                            color: c.difficulty === 'High' ? 'salmon' : c.difficulty === 'Low' ? 'lightgreen' : 'gold'
                                        }}>
                                            {c.difficulty}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openEditor(c)}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                style={{ background: 'none', border: 'none', color: 'salmon', cursor: 'pointer' }}
                                                title="Delete"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isEditing && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '600px', padding: '2rem', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3>{currentCase.id ? 'Edit Use Case' : 'New Use Case'}</h3>
                            <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Industry</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={currentCase.industry || ''}
                                        onChange={e => setCurrentCase({ ...currentCase, industry: e.target.value })}
                                        placeholder="e.g. Healthcare"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Difficulty</label>
                                    <select
                                        className="input-field"
                                        value={currentCase.difficulty || 'Med'}
                                        onChange={e => setCurrentCase({ ...currentCase, difficulty: e.target.value })}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Med">Med</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Title</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={currentCase.title || ''}
                                    onChange={e => setCurrentCase({ ...currentCase, title: e.target.value })}
                                    placeholder="e.g. Patient Intake Automation"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Description</label>
                                <textarea
                                    className="input-field"
                                    rows={3}
                                    value={currentCase.description || ''}
                                    onChange={e => setCurrentCase({ ...currentCase, description: e.target.value })}
                                    placeholder="Brief description of the solution..."
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>ROI Estimate</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={currentCase.roiEstimate || ''}
                                    onChange={e => setCurrentCase({ ...currentCase, roiEstimate: e.target.value })}
                                    placeholder="e.g. 20 hours/week saved"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tags (comma separated)</label>
                                <div style={{ position: 'relative' }}>
                                    <Tags size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        className="input-field"
                                        style={{ paddingLeft: '2.5rem' }}
                                        value={tagsInput}
                                        onChange={e => setTagsInput(e.target.value)}
                                        placeholder="AI, Automation, Legal, Compliance"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Save size={16} /> Save Use Case
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
