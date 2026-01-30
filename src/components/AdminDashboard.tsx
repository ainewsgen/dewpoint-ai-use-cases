import { useState, useEffect } from 'react';
import { CompanyData, Opportunity } from '../lib/engine';
import { Lock, Unlock, Database, Eye, Trash2, Megaphone, Save, UserX, Settings, Key, Edit, Plus, X } from 'lucide-react';

interface AdminDashboardProps {
    leads: Array<{
        id: string;
        timestamp: string;
        company: CompanyData;
        recipes: Opportunity[];
    }>;
}

interface Integration {
    id: string;
    name: string;
    status: 'active' | 'inactive';
}

export function AdminDashboard({ leads }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<'leads' | 'cms' | 'integrations'>('leads');
    const [selectedLead, setSelectedLead] = useState<string | null>(null);
    const [passcode, setPasscode] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // CMS State
    const [announcement, setAnnouncement] = useState('');
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    // Integrations State
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [newIntegrationName, setNewIntegrationName] = useState('');

    // User Edit State
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<CompanyData>>({});

    useEffect(() => {
        const storedAnn = localStorage.getItem('dpg_announcement');
        if (storedAnn) setAnnouncement(storedAnn);

        const storedInt = localStorage.getItem('dpg_integrations');
        if (storedInt) {
            setIntegrations(JSON.parse(storedInt));
        } else {
            // Default mock integrations
            setIntegrations([
                { id: '1', name: 'Salesforce', status: 'active' },
                { id: '2', name: 'HubSpot', status: 'inactive' },
                { id: '3', name: 'Slack', status: 'active' }
            ]);
        }
    }, []);

    const handleSaveAnnouncement = () => {
        localStorage.setItem('dpg_announcement', announcement);
        setShowSaveConfirm(true);
        setTimeout(() => setShowSaveConfirm(false), 2000);
    };

    const handleAddIntegration = () => {
        if (!newIntegrationName.trim()) return;
        const newInt: Integration = {
            id: Date.now().toString(),
            name: newIntegrationName,
            status: 'active'
        };
        const updated = [...integrations, newInt];
        setIntegrations(updated);
        localStorage.setItem('dpg_integrations', JSON.stringify(updated));
        setNewIntegrationName('');
    };

    const handleDeleteIntegration = (id: string) => {
        const updated = integrations.filter(i => i.id !== id);
        setIntegrations(updated);
        localStorage.setItem('dpg_integrations', JSON.stringify(updated));
    };

    const toggleIntegrationStatus = (id: string) => {
        const updated = integrations.map(i =>
            i.id === id ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' } as Integration : i
        );
        setIntegrations(updated);
        localStorage.setItem('dpg_integrations', JSON.stringify(updated));
    };

    // User Management
    const handleDeleteUser = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (confirm('Are you sure you want to ban/delete this user? This action cannot be undone.')) {
            alert(`User ${id} has been removed (Simulated).`);
        }
    };

    const handleResetPassword = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        alert(`Password reset link sent to user ${id} (Simulated).`);
    };

    const openEditUser = (lead: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingUser(lead.id);
        setEditForm(lead.company);
    };

    const saveEditUser = () => {
        alert('User profile updated (Simulated). In a real app, this would patch the DB.');
        setEditingUser(null);
    };

    // Simple mock auth
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
        <div className="container animate-fade-in" style={{ paddingTop: '2rem', position: 'relative' }}>
            <header className="library-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Database size={32} className="text-accent" />
                    <h2 className="text-accent">Admin Console</h2>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setActiveTab('leads')}
                        style={{
                            background: activeTab === 'leads' ? 'hsl(var(--accent-primary))' : 'transparent',
                            color: activeTab === 'leads' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('cms')}
                        style={{
                            background: activeTab === 'cms' ? 'hsl(var(--accent-primary))' : 'transparent',
                            color: activeTab === 'cms' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        Content Management
                    </button>
                    <button
                        onClick={() => setActiveTab('integrations')}
                        style={{
                            background: activeTab === 'integrations' ? 'hsl(var(--accent-primary))' : 'transparent',
                            color: activeTab === 'integrations' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        Integrations
                    </button>
                </div>
            </header>

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Settings size={20} /> Global Integrations
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <input
                            type="text"
                            placeholder="New Integration Name..."
                            value={newIntegrationName}
                            onChange={e => setNewIntegrationName(e.target.value)}
                            style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}
                        />
                        <button onClick={handleAddIntegration} className="btn-primary">
                            <Plus size={18} /> Add
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {integrations.map(int => (
                            <div key={int.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '10px', height: '10px', borderRadius: '50%',
                                        background: int.status === 'active' ? 'hsl(140, 70%, 50%)' : 'hsl(0, 0%, 40%)'
                                    }} />
                                    <span style={{ fontWeight: 600 }}>{int.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => toggleIntegrationStatus(int.id)}
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >
                                        {int.status === 'active' ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteIntegration(int.id)}
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid salmon', background: 'transparent', color: 'salmon', cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'cms' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Megaphone size={20} /> Landing Page Announcement
                    </h3>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                        This message will be displayed prominently on the landing (onboarding) page for all users.
                        Leave empty to disable.
                    </p>
                    <textarea
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                        placeholder="e.g., 'Maintenance scheduled for Saturday' or 'Welcome to our generic Beta!'"
                        style={{
                            width: '100%', minHeight: '150px', padding: '1rem',
                            background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)',
                            color: 'white', borderRadius: '8px', marginBottom: '1rem',
                            fontSize: '1rem'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        {showSaveConfirm && <span style={{ color: 'hsl(var(--accent-gold))' }}>Saved successfully!</span>}
                        <button onClick={handleSaveAnnouncement} className="btn-primary">
                            <Save size={18} /> Save Message
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'leads' && (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                    {/* Sidebar List */}
                    <div className="glass-panel" style={{ padding: '1rem', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Registered Leads</h3>
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
                                    marginBottom: '0.5rem',
                                    position: 'relative'
                                }}
                                className="admin-user-row"
                            >
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{lead.company.url || "Unknown Company"}</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.company.role}</p>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button
                                        onClick={(e) => openEditUser(lead, e)}
                                        title="Edit User"
                                        style={{ background: 'transparent', border: 'none', color: 'hsl(var(--accent-primary))', cursor: 'pointer', opacity: 0.8 }}
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => handleResetPassword(lead.id, e)}
                                        title="Reset Password"
                                        style={{ background: 'transparent', border: 'none', color: 'orange', cursor: 'pointer', opacity: 0.8 }}
                                    >
                                        <Key size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteUser(lead.id, e)}
                                        title="Ban/Delete User"
                                        style={{ background: 'transparent', border: 'none', color: 'salmon', cursor: 'pointer', opacity: 0.8 }}
                                    >
                                        <UserX size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Detail View */}
                    <div className="glass-panel" style={{ padding: '2rem', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                        {activeLead ? (
                            <div className="animate-fade-in">
                                <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h1 style={{ marginBottom: '0.5rem' }}>{activeLead.company.url}</h1>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button onClick={(e) => openEditUser(activeLead, e)} className="btn-secondary">
                                                <Edit size={16} /> Edit Profile
                                            </button>
                                            <button onClick={(e) => handleDeleteUser(activeLead.id, e)} className="btn-secondary" style={{ borderColor: 'salmon', color: 'salmon' }}>
                                                <Trash2 size={16} /> Ban User
                                            </button>
                                        </div>
                                    </div>
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
                                <p>Select a user to view their data.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="glass-panel animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3>Edit User Profile</h3>
                            <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Company URL</label>
                                <input
                                    type="text"
                                    value={editForm.url || ''}
                                    onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Role</label>
                                <input
                                    type="text"
                                    value={editForm.role || ''}
                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Pain Point</label>
                                <textarea
                                    value={editForm.painPoint || ''}
                                    onChange={e => setEditForm({ ...editForm, painPoint: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', minHeight: '80px' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setEditingUser(null)} className="btn-secondary">Cancel</button>
                            <button onClick={saveEditUser} className="btn-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
