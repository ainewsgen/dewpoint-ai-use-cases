import { useState, useEffect } from 'react';
import { Plus, Trash, Edit, Save, X, Search } from 'lucide-react';

interface Icp {
    id: number;
    industry: string;
    naicsCode?: string;
    icpPersona: string;
    promptInstructions: string;
    negativeIcps?: string;
    discoveryGuidance?: string;
    economicDrivers?: string;
}

export function IcpManager() {
    const [icps, setIcps] = useState<Icp[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentIcp, setCurrentIcp] = useState<Partial<Icp>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchIcps();
    }, []);

    const fetchIcps = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/icps');
            if (res.ok) {
                const data = await res.json();
                setIcps(data.icps || []);
            }
        } catch (error) {
            console.error("Failed to fetch ICPs", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const method = currentIcp.id ? 'PUT' : 'POST';
            const url = currentIcp.id ? `/api/admin/icps/${currentIcp.id}` : '/api/admin/icps';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentIcp)
            });

            if (res.ok) {
                setIsEditing(false);
                setCurrentIcp({});
                fetchIcps();
            } else {
                alert("Failed to save ICP");
            }
        } catch (error) {
            console.error("Error saving ICP", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this ICP?")) return;
        try {
            await fetch(`/api/admin/icps/${id}`, { method: 'DELETE' });
            fetchIcps();
        } catch (error) {
            console.error("Error deleting ICP", error);
        }
    };

    const filteredIcps = icps.filter(i =>
        i.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.icpPersona.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Industry ICPs</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Manage Ideal Customer Profiles and prompt injection rules.</p>
                </div>
                <button
                    onClick={() => { setCurrentIcp({}); setIsEditing(true); }}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} /> Add New ICP
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={18} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="Search industries or personas..."
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
                                <th style={{ padding: '1rem', textAlign: 'left' }}>NAICS</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Persona</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Prompt Instructions</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIcps.map(icp => (
                                <tr key={icp.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{icp.industry}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{icp.naicsCode || '-'}</td>
                                    <td style={{ padding: '1rem' }}>{icp.icpPersona}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {icp.promptInstructions}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => { setCurrentIcp(icp); setIsEditing(true); }}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(icp.id)}
                                                style={{ background: 'none', border: 'none', color: 'salmon', cursor: 'pointer' }}
                                                title="Delete"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredIcps.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No ICPs found.
                                    </td>
                                </tr>
                            )}
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
                    <div className="glass-panel" style={{ width: '500px', padding: '2rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3>{currentIcp.id ? 'Edit ICP' : 'New ICP'}</h3>
                            <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Industry Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={currentIcp.industry || ''}
                                    onChange={e => setCurrentIcp({ ...currentIcp, industry: e.target.value })}
                                    placeholder="e.g. Manufacturing"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>NAICS Code (Optional)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={currentIcp.naicsCode || ''}
                                    onChange={e => setCurrentIcp({ ...currentIcp, naicsCode: e.target.value })}
                                    placeholder="e.g. 31-33"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>ICP Persona</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={currentIcp.icpPersona || ''}
                                    onChange={e => setCurrentIcp({ ...currentIcp, icpPersona: e.target.value })}
                                    placeholder="e.g. Plant Operations Manager"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Prompt Instructions (AI Context)</label>
                                <textarea
                                    className="input-field"
                                    rows={4}
                                    value={currentIcp.promptInstructions || ''}
                                    onChange={e => setCurrentIcp({ ...currentIcp, promptInstructions: e.target.value })}
                                    placeholder="e.g. Focus on downtime reduction, preventative maintenance..."
                                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Negative ICPs (Who to avoid)</label>
                                    <textarea
                                        className="input-field"
                                        rows={3}
                                        value={currentIcp.negativeIcps || ''}
                                        onChange={e => setCurrentIcp({ ...currentIcp, negativeIcps: e.target.value })}
                                        placeholder="e.g. Startups with < $1M revenue, no dedicated maintenance team..."
                                        style={{ fontSize: '0.9rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Discovery Guidance</label>
                                    <textarea
                                        className="input-field"
                                        rows={3}
                                        value={currentIcp.discoveryGuidance || ''}
                                        onChange={e => setCurrentIcp({ ...currentIcp, discoveryGuidance: e.target.value })}
                                        placeholder="e.g. Look for job postings for 'Plant Manager' on LinkedIn..."
                                        style={{ fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Economic Drivers</label>
                                <textarea
                                    className="input-field"
                                    rows={2}
                                    value={currentIcp.economicDrivers || ''}
                                    onChange={e => setCurrentIcp({ ...currentIcp, economicDrivers: e.target.value })}
                                    placeholder="e.g. High asset turnover, high cost of downtime..."
                                    style={{ fontSize: '0.9rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Save size={16} /> Save ICP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
