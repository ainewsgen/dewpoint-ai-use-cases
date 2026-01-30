import { useState, useEffect } from 'react';
import { CompanyData, Opportunity } from '../lib/engine';
import { Lock, Unlock, Database, Eye, Megaphone, Save, Key, Edit, Plus, X, Trash, Globe, CheckCircle, AlertCircle } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState<'leads' | 'cms' | 'integrations' | 'users'>('leads');
    const [selectedLead, setSelectedLead] = useState<string | null>(null);
    const [passcode, setPasscode] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);


    // CMS State
    const [announcement, setAnnouncement] = useState('');
    const [cmsStatus, setCmsStatus] = useState<'draft' | 'published'>('draft');
    const [isEditingCms, setIsEditingCms] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    // Integrations State
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [newIntegrationName, setNewIntegrationName] = useState('');

    // User Management State (Real Auth Users)
    const [users, setUsers] = useState<any[]>([]);
    const [isEditingRealUser, setIsEditingRealUser] = useState(false);
    const [currentRealUser, setCurrentRealUser] = useState<any>(null);
    const [userEditForm, setUserEditForm] = useState({ email: '', name: '', role: 'user', password: '' });

    // Lead Edit State (Mock/Simulation for Leads View)
    const [editingUser, setEditingUser] = useState<string | null>(null); // This is "Lead ID"
    // Rename 'editForm' usage in leads view to 'leadEditForm' via find/replace or restore original name if possible
    // To avoid massive refactor of existing code, let's keep 'editForm' for Leads if possible, but I already overwrote it.
    // I need to check where 'editForm' is used.
    // Existing code uses 'editForm' for LEADS.
    // So I should name my NEW state 'userEditForm' and restore 'editForm' for LEADS.
    const [editForm, setEditForm] = useState<Partial<CompanyData>>({});

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('https://dewpoint-ai-use-cases.onrender.com/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    useEffect(() => {
        const storedAnn = localStorage.getItem('dpg_announcement');
        const storedStatus = localStorage.getItem('dpg_announcement_status');
        if (storedAnn) setAnnouncement(storedAnn);
        if (storedStatus) setCmsStatus(storedStatus as 'draft' | 'published');

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

    const handleSaveDraft = () => {
        localStorage.setItem('dpg_announcement', announcement);
        localStorage.setItem('dpg_announcement_status', 'draft');
        setCmsStatus('draft');
        setIsEditingCms(false);
        setShowSaveConfirm(true);
        setTimeout(() => setShowSaveConfirm(false), 2000);
    };

    const handlePublish = () => {
        localStorage.setItem('dpg_announcement', announcement);
        localStorage.setItem('dpg_announcement_status', 'published');
        setCmsStatus('published');
        setIsEditingCms(false);
        setShowSaveConfirm(true);
        setTimeout(() => setShowSaveConfirm(false), 2000);
    };

    const handleUnpublish = () => {
        localStorage.setItem('dpg_announcement_status', 'draft');
        setCmsStatus('draft');
    };

    const handleDeleteMessage = () => {
        if (confirm('Are you sure you want to delete this message?')) {
            setAnnouncement('');
            setCmsStatus('draft');
            localStorage.removeItem('dpg_announcement');
            localStorage.removeItem('dpg_announcement_status');
            setIsEditingCms(false);
        }
    };

    const handleAddIntegration = (e: React.FormEvent) => {
        e.preventDefault();
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

    // ... User Management handlers ... 
    // (Note: Skipping re-implementation of user mgmt handlers as they are outside the chunk, 
    // wait, I need to make sure I don't delete them. The chunk end line is 272, which is before user mgmt.
    // Actually the chunk I selected covers lines 26 to 272.
    // I need to be careful. I will include the user mgmt handlers in the replacement to be safe 
    // or just target the specific blocks.
    // Let's constrain the chunk to just the CMS and Integration logic replacement.

    // RE-EVALUATING CHUNK STRATEGY
    // I will use replace_file_content for lines 26-86 (State + Logic) and 193-272 (Render)
    // Actually, I can do it in one go if I include everything in between or use multi_replace.
    // I will use multi_replace_file_content.

    // ERROR: I cannot change tool inside decision.
    // I will proceed with replace_file_content but I need to be careful about boundaries.

    // Let's do multi_replace.

    // WAIT, I am generating `replace_file_content`. I should use `multi_replace_file_content` instead.



    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (currentRealUser) {
                // Update
                const res = await fetch(`https://dewpoint-ai-use-cases.onrender.com/api/admin/users/${currentRealUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...userEditForm, password: userEditForm.password || undefined })
                });
                if (res.ok) {
                    fetchUsers();
                    setIsEditingRealUser(false);
                    setCurrentRealUser(null);
                }
            } else {
                // Create
                const res = await fetch('https://dewpoint-ai-use-cases.onrender.com/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userEditForm)
                });
                if (res.ok) {
                    fetchUsers();
                    setIsEditingRealUser(false);
                    setUserEditForm({ email: '', name: '', role: 'user', password: '' });
                }
            }
        } catch (error) {
            console.error('Save user failed', error);
        }
    };

    const handleDeleteUserReal = async (id: number) => {
        if (confirm('Are you sure you want to deactivate this user?')) {
            try {
                await fetch(`https://dewpoint-ai-use-cases.onrender.com/api/admin/users/${id}`, { method: 'DELETE' });
                fetchUsers();
            } catch (error) {
                console.error('Delete user failed', error);
            }
        }
    };

    const openEditUserModal = (user?: any) => {
        if (user) {
            setCurrentRealUser(user);
            setUserEditForm({ email: user.email, name: user.name || '', role: user.role, password: '' });
        } else {
            setCurrentRealUser(null);
            setUserEditForm({ email: '', name: '', role: 'user', password: '' });
        }
        setIsEditingRealUser(true);
    };

    // User Management (MOCK for Leads View)
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
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            background: activeTab === 'users' ? 'hsl(var(--accent-primary))' : 'transparent',
                            color: activeTab === 'users' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        Users
                    </button>
                </div>
            </header>

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={20} /> Global Integrations
                    </h3>
                    <form onSubmit={handleAddIntegration} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <input
                            type="text"
                            placeholder="New Integration Name..."
                            value={newIntegrationName}
                            onChange={e => setNewIntegrationName(e.target.value)}
                            style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}
                        />
                        <button type="submit" className="btn-primary">
                            <Plus size={18} /> Add
                        </button>
                    </form>

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
                                        title="Delete Integration"
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid salmon', background: 'transparent', color: 'salmon', cursor: 'pointer' }}
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'cms' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Megaphone size={20} /> Landing Page Announcement
                        </h3>
                        <div className="badge" style={{
                            background: cmsStatus === 'published' ? 'hsl(140, 70%, 20%)' : 'hsl(0, 0%, 20%)',
                            color: cmsStatus === 'published' ? 'hsl(140, 70%, 80%)' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                            {cmsStatus === 'published' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {cmsStatus === 'published' ? 'Live' : 'Draft'}
                        </div>
                    </div>

                    <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                        This message will be displayed prominently on the landing (onboarding) page for all users.
                    </p>

                    {isEditingCms ? (
                        <div className="animate-fade-in">
                            <textarea
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                placeholder="e.g., 'Maintenance scheduled for Saturday' or 'Welcome to our generic Beta!'"
                                style={{
                                    width: '100%', minHeight: '150px', padding: '1rem',
                                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)',
                                    color: 'white', borderRadius: '8px', marginBottom: '1rem',
                                    fontSize: '1rem', fontFamily: 'inherit'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                                <button onClick={() => setIsEditingCms(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button onClick={handleSaveDraft} className="btn-secondary">
                                    <Save size={18} /> Save Draft
                                </button>
                                <button onClick={handlePublish} className="btn-primary">
                                    <Globe size={18} /> Publish Now
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <div style={{
                                padding: '1.5rem', background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px', marginBottom: '1.5rem', minHeight: '100px',
                                display: 'flex', alignItems: announcement ? 'flex-start' : 'center',
                                justifyContent: announcement ? 'flex-start' : 'center'
                            }}>
                                {announcement ? (
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{announcement}</p>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No announcement set.</p>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    onClick={handleDeleteMessage}
                                    style={{ color: 'salmon', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Trash size={16} /> Delete Message
                                </button>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {cmsStatus === 'published' && (
                                        <button onClick={handleUnpublish} className="btn-secondary">
                                            Unpublish (Hide)
                                        </button>
                                    )}
                                    {cmsStatus === 'draft' && announcement && (
                                        <button onClick={handlePublish} className="btn-primary">
                                            Publish
                                        </button>
                                    )}
                                    <button onClick={() => setIsEditingCms(true)} className="btn-secondary">
                                        <Edit size={16} /> Edit Message
                                    </button>
                                </div>
                            </div>
                            {showSaveConfirm && <p style={{ textAlign: 'right', marginTop: '0.5rem', color: 'hsl(140, 70%, 50%)', fontSize: '0.9rem' }}>Changes saved!</p>}
                        </div>
                    )}
                </div>
            )}

            {/* Logic for Grouping Leads */}
            {activeTab === 'leads' && (() => {
                // Group duplicates by Email (or URL if no email)
                const uniqueUsers = leads.reduce((acc, lead) => {
                    const key = lead.company.email || lead.company.url;
                    if (!acc[key]) {
                        acc[key] = {
                            ...lead,
                            allRecipes: [...lead.recipes],
                            interactionCount: 1
                        };
                    } else {
                        // Merge recipes
                        acc[key].allRecipes.push(...lead.recipes);
                        acc[key].interactionCount += 1;
                        // Update to latest timestamp/data if newer? (Optional, kept simple here)
                    }
                    return acc;
                }, {} as Record<string, any>);

                const userList = Object.values(uniqueUsers);
                const activeUser = userList.find(u => u.id === selectedLead) || (selectedLead ? leads.find(l => l.id === selectedLead) : null); // Fallback

                return (
                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                        {/* Sidebar List */}
                        <div className="glass-panel" style={{ padding: '1rem', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Registered Users</h3>
                            {userList.length === 0 && <p style={{ color: '#666', fontStyle: 'italic' }}>No users found.</p>}
                            {userList.map((user: any) => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedLead(user.id)} // Using first ID as the key for selection
                                    style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid var(--border-glass)',
                                        cursor: 'pointer',
                                        background: selectedLead === user.id ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                        borderRadius: '8px',
                                        marginBottom: '0.5rem',
                                        position: 'relative'
                                    }}
                                    className="admin-user-row"
                                >
                                    <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 600 }}>{user.company.name || "Anonymous"}</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--accent-primary))' }}>{user.company.email || user.company.url}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        {user.company.role} • {user.allRecipes.length} Blueprints
                                    </p>

                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button
                                            onClick={(e) => openEditUser(user, e)}
                                            title="Edit Profile"
                                            style={{ background: 'transparent', border: 'none', color: 'hsl(var(--accent-primary))', cursor: 'pointer', opacity: 0.8 }}
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteUser(user.id, e)}
                                            title="Delete User"
                                            style={{ background: 'transparent', border: 'none', color: 'salmon', cursor: 'pointer', opacity: 0.8 }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Main Detail View */}
                        <div className="glass-panel" style={{ padding: '2rem', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                            {activeUser ? (
                                <div className="animate-fade-in">
                                    <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h1 style={{ marginBottom: '0.5rem' }}>{activeUser.company.name || "Anonymous User"}</h1>
                                                <p style={{ color: 'hsl(var(--accent-primary))', fontSize: '1.1rem' }}>{activeUser.company.email}</p>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{activeUser.company.url}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button onClick={(e) => openEditUser(activeUser, e)} className="btn-secondary">
                                                    <Edit size={16} /> Edit Profile
                                                </button>
                                                <button onClick={(e) => handleResetPassword(activeUser.id, e)} className="btn-secondary">
                                                    <Key size={16} /> Reset PWD
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Role</label>
                                                <p>{activeUser.company.role}</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Company Size</label>
                                                <p>{activeUser.company.size}</p>
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Primary Pain Point</label>
                                                <p>"{activeUser.company.painPoint}"</p>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 style={{ marginBottom: '1rem', color: 'hsl(var(--accent-primary))' }}>
                                        Unlocked Blueprints ({activeUser.allRecipes ? activeUser.allRecipes.length : activeUser.recipes.length})
                                    </h3>
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        {(activeUser.allRecipes || activeUser.recipes).map((r: any, idx: number) => (
                                            <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <h4 style={{ fontSize: '1.1rem' }}>{r.title}</h4>
                                                    <span className="badge" style={{ background: '#333' }}>{r.department}</span>
                                                </div>
                                                {/* ... recipes details ... */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                                    <div>
                                                        <label style={{ color: '#888', display: 'block', marginBottom: '0.25rem' }}>Tech Stack</label>
                                                        <div className="chips-grid" style={{ gap: '0.25rem' }}>
                                                            {r.admin_view.tech_stack.map((t: string) => (
                                                                <span key={t} style={{ background: '#222', padding: '2px 8px', borderRadius: '4px', border: '1px solid #444', fontSize: '0.75rem' }}>{t}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ color: '#888', display: 'block', marginBottom: '0.25rem' }}>Upsell Opp</label>
                                                        <p style={{ color: 'hsl(140, 70%, 50%)' }}>{r.admin_view.upsell_opportunity}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Eye size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p>Select a user to view their activity history.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

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
            {/* Users Tab - Real User Management */}
            {activeTab === 'users' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3>Registered Users</h3>
                        <button onClick={() => openEditUserModal()} className="btn-primary">
                            <Plus size={18} /> Add User
                        </button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>Role</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>{u.name || '-'}</td>
                                    <td style={{ padding: '1rem' }}>{u.email}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            background: u.role === 'admin' ? 'hsl(var(--accent-gold))' : '#333',
                                            color: u.role === 'admin' ? 'black' : 'white',
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ color: u.isActive ? 'hsl(140, 70%, 50%)' : 'salmon' }}>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button onClick={() => openEditUserModal(u)} style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-primary))', cursor: 'pointer', marginRight: '1rem' }}>
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteUserReal(u.id)} style={{ background: 'none', border: 'none', color: 'salmon', cursor: 'pointer' }}>
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit/Create User Modal */}
            {isEditingRealUser && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3>{currentRealUser ? 'Edit User' : 'Add New User'}</h3>
                            <button onClick={() => setIsEditingRealUser(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveUser} style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                                <input
                                    type="email"
                                    required
                                    value={userEditForm.email}
                                    onChange={e => setUserEditForm({ ...userEditForm, email: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
                                <input
                                    type="text"
                                    value={userEditForm.name}
                                    onChange={e => setUserEditForm({ ...userEditForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Role</label>
                                <select
                                    value={userEditForm.role}
                                    onChange={e => setUserEditForm({ ...userEditForm, role: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#222', color: 'white' }}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                    {currentRealUser ? 'New Password (leave blank to keep)' : 'Password'}
                                </label>
                                <input
                                    type="password"
                                    required={!currentRealUser}
                                    value={userEditForm.password}
                                    onChange={e => setUserEditForm({ ...userEditForm, password: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsEditingRealUser(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">{currentRealUser ? 'Save Changes' : 'Create User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
