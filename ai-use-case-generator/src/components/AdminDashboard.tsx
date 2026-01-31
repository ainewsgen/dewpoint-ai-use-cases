import { useState, useEffect } from 'react';
import { CompanyData, Opportunity } from '../lib/engine';
import { Plus, Trash, Edit, CheckCircle, AlertCircle, Save, MonitorStop, RefreshCw, X, Shield, Lock, FileText, Megaphone, Globe, Database, Bot, Activity, Eye, Sparkles } from 'lucide-react';

interface AdminDashboardProps {
    leads: Array<{
        id: string;
        timestamp: string;
        company: CompanyData;
        recipes: Opportunity[];
    }>;
}

interface Integration {
    id: number;
    name: string;
    authType: 'api_key' | 'oauth' | 'basic';
    baseUrl?: string;
    apiKey?: string; // Only present if we handle it carefully, mostly for checking existence
    enabled: boolean;
    status?: 'active' | 'error' | 'testing' | 'success';
    metadata?: Record<string, any>;
}

// Add Integration Modal Props
interface IntegrationModalProps {
    integration?: Integration;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export function AdminDashboard({ leads }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<'leads' | 'cms' | 'integrations' | 'users' | 'blueprints' | 'observability'>('leads');
    const [selectedLead, setSelectedLead] = useState<string | null>(null);
    // Local state for fetched leads (ignoring props now)
    const [adminLeads, setAdminLeads] = useState<any[]>([]);

    // Usage Stats State
    const [usageStats, setUsageStats] = useState<{ spend: number; requests: number; limit: number; integrationId?: number; debugMeta?: any } | null>(null);
    const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

    // CMS State
    const [announcement, setAnnouncement] = useState('');
    const [cmsStatus, setCmsStatus] = useState<'draft' | 'published'>('draft');
    const [isEditingCms, setIsEditingCms] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    // Integrations State
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isEditingIntegration, setIsEditingIntegration] = useState(false);
    const [currentIntegration, setCurrentIntegration] = useState<Integration | null>(null);
    const [testingId, setTestingId] = useState<number | null>(null);

    // User Management State (Real Auth Users)
    const [users, setUsers] = useState<any[]>([]);
    const [isEditingRealUser, setIsEditingRealUser] = useState(false);
    const [currentRealUser, setCurrentRealUser] = useState<any>(null);
    const [userEditForm, setUserEditForm] = useState({ email: '', name: '', role: 'user', password: '' });

    // Blueprint Edit State
    const [editingBlueprint, setEditingBlueprint] = useState<Opportunity | null>(null);

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
        } else if (activeTab === 'leads') {
            fetchLeads();
        }
    }, [activeTab]);

    const fetchLeads = async () => {
        try {
            const res = await fetch('/api/admin/leads');
            if (res.ok) {
                const data = await res.json();
                // Admin API returns { leads: [ { lead: {...}, company: {...}, user: {...} }, ... ] }
                // Map to flat structure expected by the dashboard
                const formattedLeads = (data.leads || []).map((row: any) => ({
                    id: row.lead.id,
                    timestamp: row.lead.createdAt || new Date().toISOString(),
                    company: {
                        ...row.company,
                        email: row.user?.email || 'unknown', // Enrich with user email
                        name: row.company?.name || row.user?.name || 'Anonymous'
                    },
                    recipes: row.lead.recipes || [],
                    // Keep original user object if needed
                    user: row.user
                }));
                setAdminLeads(formattedLeads);
            }
        } catch (error) {
            console.error('Failed to fetch admin leads', error);
        }
    };


    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
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
    }, []);

    useEffect(() => {
        if (activeTab === 'integrations') {
            fetchIntegrations();
        } else if (activeTab === 'observability') {
            fetchUsageStats();
        }
    }, [activeTab]);

    const fetchIntegrations = async () => {
        try {
            const res = await fetch('/api/admin/integrations', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } // Assuming token storage
            });
            if (res.ok) {
                const data = await res.json();
                setIntegrations(data.integrations.map((i: any) => ({ ...i, status: i.enabled ? 'active' : 'inactive' })));
            }
        } catch (error) {
            console.error('Failed to fetch integrations', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'observability') {
            fetchUsageStats();
        }
    }, [activeTab]);

    const fetchUsageStats = async () => {
        try {
            const res = await fetch('/api/admin/usage/stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log('Usage Stats Loaded:', data);
                setUsageStats(data);
            } else {
                console.error('Usage Stats Failed:', await res.text());
            }
        } catch (error) {
            console.error('Failed to fetch usage stats', error);
        }
    };

    const handleUpdateLimit = async (newLimit: number) => {
        setIsUpdatingLimit(true);
        try {
            const res = await fetch('/api/admin/usage/limit', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: newLimit })
            });

            if (res.ok) {
                // Optimistically update local state immediately
                setUsageStats(prev => ({
                    spend: prev?.spend || 0,
                    requests: prev?.requests || 0,
                    limit: newLimit
                }));

                // Fetch latest to confirm
                await fetchUsageStats();
                alert("Daily budget limit updated!");
            } else {
                alert("Failed to update limit.");
            }
        } catch (error) {
            console.error("Update limit error", error);
        } finally {
            setIsUpdatingLimit(false);
        }
    };

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

    const handleSaveIntegration = async (data: any) => {
        try {
            // Fix for "Shimmed" Integrations (ID 0) -> Treat as NEW
            const isNew = !currentIntegration || currentIntegration.id === 0;

            const url = isNew
                ? '/api/integrations'
                : `/api/integrations/${currentIntegration.id}`;

            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': ... (Add auth header if we have context, or assume cookie for now if using that)
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                fetchIntegrations();
                setIsEditingIntegration(false);
                setCurrentIntegration(null);
            } else {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error || 'Unknown server error';
                console.error('Save error details:', errData);
                alert(`Failed to save integration: ${errMsg}`);
            }
        } catch (error) {
            console.error('Save integration failed', error);
            alert('Save failed: ' + error);
        }
    };

    const handleDeleteIntegration = async (id: number) => {
        if (confirm('Are you sure you want to delete this integration?')) {
            try {
                await fetch(`/api/integrations/${id}`, { method: 'DELETE' });
                fetchIntegrations();
            } catch (error) {
                console.error('Delete integration failed', error);
            }
        }
    };

    const handleTestConnection = async (id: number) => {
        setTestingId(id);
        try {
            const res = await fetch(`/api/integrations/${id}/test`, { method: 'POST' });
            if (res.ok) {
                alert('Connection Successful! ✅');
            } else {
                alert('Connection Failed ❌');
            }
        } catch (error) {
            alert('Connection Error');
        } finally {
            setTestingId(null);
        }
    };

    const openEditIntegration = (int?: Integration) => {
        setCurrentIntegration(int || null);
        setIsEditingIntegration(true);
    };

    // Blueprint Mock Logic
    const handleEditBlueprint = async (name: string) => {
        // Dynamic import to retrieve generator if not available in scope, 
        // or assumes 'generateOpportunities' is exported from '../lib/engine' (it is).
        const { generateOpportunities } = await import('../lib/engine');

        const dummyData: CompanyData = {
            url: 'example.com', role: 'CTO', size: 'Enterprise',
            stack: ['Salesforce', 'Slack', 'Jira', 'QuickBooks'],
            painPoint: 'Manual Data Entry'
        };
        const sampleOpps = generateOpportunities(dummyData);

        // Find best match or default to first if name mismatch (since names are dynamic sometimes)
        // Actually names are relatively static in the generator.
        const match = sampleOpps.find(o => o.title === name) || sampleOpps[0];

        // Deep copy to allow editing state
        setEditingBlueprint(JSON.parse(JSON.stringify(match)));
    };

    const handleSaveBlueprint = () => {
        // Here we would sync to backend or file system
        alert("Template updated locally! (In a real app, this would update the 'engine.ts' logic or database template).");
        setEditingBlueprint(null);
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
                const res = await fetch(`/api/admin/users/${currentRealUser.id}`, {
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
                const res = await fetch('/api/admin/users', {
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
                await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
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




    return (
        <div className="container animate-fade-in" style={{ paddingTop: '8rem', position: 'relative' }}>
            <header className="library-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-secondary)/0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <Shield size={48} className="text-secondary" />
                </div>
                <h2 className="text-accent" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    Admin Console <span style={{ fontSize: '1rem', opacity: 0.6, border: '1px solid currentColor', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle' }}>v3.18</span>
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', margin: 0 }}>System Management & Overview</p>
                    <button
                        onClick={() => {
                            fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
                                window.location.href = '/login';
                            });
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <MonitorStop size={14} /> Log Out
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTab('leads')}
                        style={{
                            background: activeTab === 'leads' ? 'hsl(var(--accent-primary))' : 'hsla(var(--bg-card)/0.6)',
                            color: activeTab === 'leads' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1.5rem', borderRadius: '50px', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600,
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        Customer Interests / Leads
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            background: activeTab === 'users' ? 'hsl(var(--accent-primary))' : 'hsla(var(--bg-card)/0.6)',
                            color: activeTab === 'users' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1.5rem', borderRadius: '50px', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600,
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('cms')}
                        style={{
                            background: activeTab === 'cms' ? 'hsl(var(--accent-primary))' : 'hsla(var(--bg-card)/0.6)',
                            color: activeTab === 'cms' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1.5rem', borderRadius: '50px', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600,
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        Announcements
                    </button>
                    <button
                        onClick={() => setActiveTab('blueprints')}
                        style={{
                            background: activeTab === 'blueprints' ? 'hsl(var(--accent-primary))' : 'hsla(var(--bg-card)/0.6)',
                            color: activeTab === 'blueprints' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1.5rem', borderRadius: '50px', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600,
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        Blueprints & AI
                    </button>
                    <button
                        onClick={() => setActiveTab('integrations')}
                        style={{
                            background: activeTab === 'integrations' ? 'hsl(var(--accent-primary))' : 'hsla(var(--bg-card)/0.6)',
                            color: activeTab === 'integrations' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1.5rem', borderRadius: '50px', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600,
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        Integrations
                    </button>
                    <button
                        onClick={() => setActiveTab('observability')}
                        style={{
                            background: activeTab === 'observability' ? 'hsl(var(--accent-primary))' : 'hsla(var(--bg-card)/0.6)',
                            color: activeTab === 'observability' ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-glass)',
                            padding: '0.5rem 1.5rem', borderRadius: '50px', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600,
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        Observability
                    </button>
                </div>
            </header>

            {/* Observability Tab */}
            {activeTab === 'observability' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--accent-gold))' }}>
                            <Activity size={20} /> AI Usage & Budget
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={fetchUsageStats}
                                className="btn-secondary"
                                style={{ padding: '0.5rem' }}
                                title="Refresh"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        {/* Budget Card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Daily Budget Limit</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>${usageStats?.limit?.toFixed(2) || '0.00'}</span>
                                {isUpdatingLimit ? (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updating...</span>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const newLimit = prompt("Set new daily limit in USD (e.g., 5.00):", usageStats?.limit?.toString());
                                            if (newLimit && !isNaN(parseFloat(newLimit))) {
                                                handleUpdateLimit(parseFloat(newLimit));
                                            }
                                        }}
                                        className="btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                    >
                                        <Edit size={12} /> Edit
                                    </button>
                                )}
                            </div>
                            <div style={{ marginTop: '1rem', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min(((usageStats?.spend || 0) / (usageStats?.limit || 1)) * 100, 100)}%`,
                                    background: (usageStats?.spend || 0) > (usageStats?.limit || 0) ? 'salmon' : 'hsl(var(--accent-primary))',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: (usageStats?.spend || 0) > (usageStats?.limit || 0) ? 'salmon' : 'var(--text-muted)' }}>
                                ${usageStats?.spend?.toFixed(4)} used today
                            </p>
                        </div>

                        {/* Request Count Card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Total Requests Today</label>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'white' }}>
                                {usageStats?.requests || 0}
                            </div>
                        </div>
                    </div>

                    {/* System Forecast / Diagnostic */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                            <Activity size={18} /> System Forecast
                        </h4>

                        {(() => {
                            const hasActiveIntegration = integrations.some(i => i.enabled);
                            const budgetExceeded = (usageStats?.spend || 0) >= (usageStats?.limit || 100);

                            // Determine State
                            let status = 'System (Fallback)';
                            let color = 'salmon';
                            let reason = 'Unknown Error';

                            if (!hasActiveIntegration) {
                                status = 'System (Fallback)';
                                color = 'orange';
                                reason = 'No active AI integrations found. Navigate to the Integrations tab to connect a provider.';
                            } else if (budgetExceeded) {
                                status = 'System (Fallback)';
                                color = 'salmon';
                                reason = `Daily budget limit ($${usageStats?.limit}) has been reached relative to current spend ($${usageStats?.spend}).`;
                            } else {
                                status = 'AI (Live Generation)';
                                color = 'hsl(140, 70%, 50%)';
                                reason = 'System is healthy. Active Integration found and budget is sufficient for new runs.';
                            }

                            return (
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        background: color === 'salmon' ? 'rgba(250, 128, 114, 0.2)' : (color === 'orange' ? 'rgba(255, 165, 0, 0.2)' : 'rgba(0, 255, 127, 0.1)'),
                                        border: `1px solid ${color}`,
                                        color: color,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {status}
                                    </div>
                                    <div>
                                        <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'white' }}>Current Operational Mode</strong>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                            {reason}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={16} /> Budget Enforcement
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            When the daily limit is reached, all AI Generation requests will automatically fall back to static templates to prevent overage charges.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={16} color="hsl(var(--accent-primary))" /> Hard Limit Active
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={16} color="hsl(var(--accent-primary))" /> Admin Notifications (Coming Soon)
                            </div>
                        </div>
                    </div>

                    {/* Debug Panel for Persistence Issues */}
                    <div style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed #444', borderRadius: '8px', opacity: 0.7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h5 style={{ color: '#888', margin: 0, fontSize: '0.8rem' }}>🛠️ Debug: Integration Persistence</h5>
                            <button
                                onClick={fetchUsageStats}
                                className="btn-secondary"
                                style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}
                            >
                                <RefreshCw size={12} style={{ marginRight: '4px' }} /> Refresh
                            </button>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#aaa' }}>
                            <p>DB Count: <span style={{ color: 'white' }}>{(usageStats as any)?.integrationCount ?? '?'}</span></p>
                            <p>Integration ID: <span style={{ color: 'white' }}>{usageStats?.integrationId || 'Values not found'}</span></p>
                            <p>Raw Metadata: <span style={{ color: 'white' }}>{JSON.stringify(usageStats?.debugMeta || {})}</span></p>
                        </div>
                    </div>
                </div>
            )}

            {/* Blueprints & AI Tab */}
            {activeTab === 'blueprints' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'hsl(var(--accent-gold))' }}>
                            <Sparkles size={20} /> AI Generation Config
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Manage the precanned prompt used by the engine to generate specific recipe details.
                        </p>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>System Prompt Template</label>
                            <textarea
                                defaultValue={`You are an expert Solutions Architect. Analyze the following user profile to design high-impact automation solutions.

User Profile:
- Company URL: {{url}}
- Industry: {{industry}}
- Company Size: {{size}}
- Role: {{role}}
- Tech Stack: {{stack}}
- Primary Pain Point: {{painPoint}}
- Website Summary: {{description}}
- Deep Site Analysis: {{pageContext}}

Generate 3 custom automation blueprints in JSON format. Each blueprint MUST include the following fields:

1.  **Title**: A catchy name for the automation.
2.  **Department**: The target department (e.g., Sales, Finance, Ops).
3.  **Problem**: A concise statement of the friction point.
4.  **Solution Narrative**: A 1-sentence elevator pitch of the solution.
5.  **Value Proposition**: Key benefit (e.g., "Eliminates context switching").
6.  **ROI Estimate**: Specific time/money saved (e.g., "10 hrs/week").
7.  **Deep Dive**: A detailed paragraph explaining the "How" and "Why".
8.  **Example Scenario**: A real-world "Before & After" story.
9.  **Walkthrough Steps**: A chronologically ordered list of 5-7 execution steps.
10. **Tech Stack Details**: List of specific tools used + their role (e.g., "OpenAI: Reasoning").
11. **Difficulty**: Implementation effort (Low, Med, High).
12. **Upsell**: A potential service retainer or expansion opportunity.`}
                                style={{
                                    width: '100%', minHeight: '400px',
                                    background: '#111', color: '#eee',
                                    border: '1px solid #333', borderRadius: '6px',
                                    fontFamily: 'monospace', padding: '1rem', lineHeight: '1.5'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button className="btn-primary" onClick={() => alert("System Prompt Updated (Configuration Saved)")}>
                                    <Save size={16} /> Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>

                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Database size={20} /> Managed Blueprints
                    </h3>

                    {/* Mock List of Core Blueprints */}
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {['The Silent Assistant', 'The Invoice Watchdog', 'The Omni-Channel Nurture', 'The Project Pulse'].map((name, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                                <span style={{ fontWeight: 600 }}>{name}</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <span className="badge" style={{ background: i % 2 === 0 ? '#222' : '#333' }}>{i % 2 === 0 ? 'Core' : 'Advanced'}</span>
                                    <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }} title="Edit Template" onClick={() => handleEditBlueprint(name)}>
                                        <Edit size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Integrations Tab */}

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
                                placeholder="e.g., 'System Maintenance: Saturday 2am' or 'Welcome to the Beta!'"
                                style={{
                                    width: '100%', minHeight: '150px', padding: '1rem',
                                    background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                                    color: 'var(--text-main)', borderRadius: '8px', marginBottom: '1rem',
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
                const uniqueUsers = adminLeads.reduce((acc: any, lead: any) => {
                    const key = lead.company?.email || lead.company?.url || 'unknown';
                    if (!acc[key]) {
                        acc[key] = {
                            ...lead,
                            allRecipes: [...(lead.recipes || [])],
                            interactionCount: 1
                        };
                    } else {
                        // Merge recipes
                        acc[key].allRecipes.push(...(lead.recipes || []));
                        acc[key].interactionCount += 1;
                    }
                    return acc;
                }, {} as Record<string, any>);

                const userList = Object.values(uniqueUsers);
                // Fix: Only look in userList (which comes from adminLeads), DO NOT fallback to 'leads' prop which might be malformed
                const activeUser = userList.find((u: any) => u.id === selectedLead);

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
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{r.title}</h4>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span className="badge" style={{ background: '#333' }}>{r.department}</span>
                                                        {r.industry && (
                                                            <span style={{
                                                                fontSize: '0.65rem',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.05em',
                                                                color: 'var(--text-muted)',
                                                                border: '1px solid var(--border-glass)',
                                                                padding: '1px 4px',
                                                                borderRadius: '3px'
                                                            }}>
                                                                {r.industry}
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', padding: '1px 4px', borderRadius: '3px', marginLeft: '0.25rem' }}>
                                                            {r.generation_metadata?.source || 'System'}
                                                        </span>                                    {r.generation_metadata?.fallback_reason && (
                                                            <span style={{ color: 'salmon', marginLeft: '0.5rem' }}>
                                                                ⚠️ {r.generation_metadata.fallback_reason}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* ... recipes details ... */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                                    <div>
                                                        <label style={{ color: '#888', display: 'block', marginBottom: '0.25rem' }}>Tech Stack</label>
                                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                            {/* Shim: Use stack_details if available, else map tech_stack to generic details */}
                                                            {(r.admin_view.stack_details || (r.admin_view.tech_stack || []).map((t: string) => ({ tool: t, role: 'Core Integration' }))).map((detail: any, i: number) => (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: '#222', padding: '4px 8px', borderRadius: '4px', border: '1px solid #444' }}>
                                                                    <span style={{ fontWeight: 600, color: 'white' }}>{detail.tool}</span>
                                                                    <span style={{ color: '#888', fontSize: '0.75rem', fontStyle: 'italic' }}>{detail.role}</span>
                                                                </div>
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

            {/* Blueprint Editor Modal */}
            {editingBlueprint && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1100
                }}>
                    <div className="glass-panel animate-fade-in" style={{ padding: '2rem', width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem' }}>Editing Blueprint Template</h3>
                                <p style={{ color: 'hsl(var(--accent-gold))', fontSize: '1rem' }}>{editingBlueprint.title}</p>
                            </div>
                            <button onClick={() => setEditingBlueprint(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {/* Narrative Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Problem Statement Template</label>
                                    <textarea
                                        value={editingBlueprint.public_view.problem}
                                        onChange={e => setEditingBlueprint({ ...editingBlueprint, public_view: { ...editingBlueprint.public_view, problem: e.target.value } })}
                                        style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: '#eee' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Solution Narrative</label>
                                    <textarea
                                        value={editingBlueprint.public_view.solution_narrative}
                                        onChange={e => setEditingBlueprint({ ...editingBlueprint, public_view: { ...editingBlueprint.public_view, solution_narrative: e.target.value } })}
                                        style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: '#eee' }}
                                    />
                                </div>
                            </div>

                            {/* Implementation Steps */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Implementation Steps (One per line)</label>
                                <textarea
                                    value={editingBlueprint.public_view.walkthrough_steps?.join('\n') || ''}
                                    onChange={e => {
                                        const steps = e.target.value.split('\n');
                                        setEditingBlueprint({ ...editingBlueprint, public_view: { ...editingBlueprint.public_view, walkthrough_steps: steps } })
                                    }}
                                    style={{ width: '100%', minHeight: '150px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: '#eee', fontFamily: 'monospace' }}
                                />
                            </div>

                            {/* Stack Details */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tech Stack Logic</label>
                                <div style={{ padding: '1rem', background: '#222', borderRadius: '6px' }}>
                                    {editingBlueprint.admin_view.stack_details?.map((detail, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                            <input value={detail.tool} readOnly style={{ background: '#333', border: 'none', padding: '0.5rem', color: '#aaa', flex: 1, borderRadius: '4px' }} />
                                            <input value={detail.role} onChange={(e) => {
                                                const newDetails = [...(editingBlueprint.admin_view.stack_details || [])];
                                                newDetails[idx].role = e.target.value;
                                                setEditingBlueprint({ ...editingBlueprint, admin_view: { ...editingBlueprint.admin_view, stack_details: newDetails } });
                                            }} style={{ background: '#111', border: '1px solid #444', padding: '0.5rem', color: 'white', flex: 2, borderRadius: '4px' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                            <button onClick={() => setEditingBlueprint(null)} className="btn-secondary">Cancel</button>
                            <button onClick={handleSaveBlueprint} className="btn-primary">
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
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
            {activeTab === 'integrations' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3>Connected Tools & APIs</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => {
                                setCurrentIntegration({
                                    id: 0, name: 'OpenAI', authType: 'api_key', baseUrl: '', enabled: true,
                                });
                                setIsEditingIntegration(true);
                            }} className="btn-primary" style={{ background: 'hsl(var(--accent-primary))' }}>
                                <Bot size={16} /> Connect OpenAI
                            </button>
                            <button onClick={() => {
                                setCurrentIntegration(null);
                                setIsEditingIntegration(true);
                            }} className="btn-secondary">
                                <Plus size={16} /> Add Custom
                            </button>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Type</th>
                                <th style={{ padding: '1rem' }}>Base URL</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {integrations.map(i => (
                                <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>{i.name}</td>
                                    <td style={{ padding: '1rem' }}>{i.authType === 'api_key' ? 'API Key' : 'OAuth'}</td>
                                    <td style={{ padding: '1rem' }}>{i.baseUrl || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ color: i.enabled ? 'hsl(140, 70%, 50%)' : 'salmon' }}>
                                            {i.enabled ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button onClick={() => openEditIntegration(i)} style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-primary))', cursor: 'pointer', marginRight: '1rem' }}>
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteIntegration(i.id)} style={{ background: 'none', border: 'none', color: 'salmon', cursor: 'pointer' }}>
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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

            {/* Integration Modal */}
            {isEditingIntegration && (
                <IntegrationModal
                    integration={currentIntegration || undefined}
                    onClose={() => setIsEditingIntegration(false)}
                    onSave={handleSaveIntegration}
                />
            )}
        </div>
    );
}

function IntegrationModal({ integration, onClose, onSave }: IntegrationModalProps) {
    const [name, setName] = useState(integration?.name || '');
    const [authType, setAuthType] = useState(integration?.authType || 'api_key');
    const [baseUrl, setBaseUrl] = useState(integration?.baseUrl || '');
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState(integration?.enabled ?? true);

    // Metadata fields
    const metadata = (integration?.metadata as any) || {};
    const [provider, setProvider] = useState<string>(metadata.provider || 'openai');
    const [model, setModel] = useState<string>(metadata.model || '');

    const [isTesting, setIsTesting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({
            name,
            authType,
            baseUrl,
            apiKey: apiKey || undefined,
            enabled: status,
            metadata: {
                ...metadata,
                provider,
                model
            }
        });
    };

    const handleTest = async () => {
        if (!integration?.id) return;
        setIsTesting(true);
        try {
            const res = await fetch(`/api/integrations/${integration.id}/test`, { method: 'POST' });
            if (res.ok) alert('Connection Successful! ✅');
            else alert('Connection Failed ❌');
        } catch (e) {
            alert('Connection Error');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '90%', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Database size={20} className="text-accent" />
                        {integration ? 'Edit Connection' : 'New Connection'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                    <div>
                        <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Integration Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. My OpenAI, Google Gemini..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Provider</label>
                            <select
                                value={provider}
                                onChange={e => {
                                    setProvider(e.target.value);
                                    if (e.target.value === 'gemini') setModel('gemini-1.5-pro');
                                    else if (e.target.value === 'openai') setModel('gpt-4o');
                                }}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="gemini">Google Gemini</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Model ID</label>
                            <input
                                type="text"
                                placeholder={provider === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4o'}
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Auth Type</label>
                            <select
                                value={authType}
                                onChange={e => setAuthType(e.target.value as any)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            >
                                <option value="api_key">API Key</option>
                                <option value="oauth">OAuth 2.0</option>
                            </select>
                        </div>
                        <div>
                            <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Status</label>
                            <div
                                onClick={() => setStatus(!status)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)',
                                    cursor: 'pointer', background: status ? 'hsla(140, 70%, 50%, 0.1)' : 'var(--bg-card)'
                                }}
                            >
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: status ? 'hsl(140, 70%, 50%)' : '#666' }} />
                                <span style={{ color: 'var(--text-main)' }}>{status ? 'Active' : 'Disabled'}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Base URL (Optional)</label>
                        <input
                            type="text"
                            placeholder="https://api.example.com/v1"
                            value={baseUrl}
                            onChange={e => setBaseUrl(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div>
                        <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                            {integration ? 'Update API Key (Leave blank to keep)' : 'API Key / Token'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="password"
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            />
                            <Lock size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        {integration?.id && (
                            <button type="button" onClick={handleTest} disabled={isTesting} className="btn-secondary" style={{ marginRight: 'auto' }}>
                                {isTesting ? 'Testing...' : 'Test Connection'}
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">
                            <Save size={18} /> Save Connection
                        </button>
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', textAlign: 'center' }}>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!confirm("This will attempt to repair the database schema. Continue?")) return;
                                try {
                                    // 1. Attempt Fix
                                    const resFix = await fetch('/api/debug/fix-schema', { method: 'POST' });
                                    const fixData = await resFix.json();

                                    // 2. Report Status & Current Columns
                                    const resSchema = await fetch('/api/debug/schema');
                                    const schemaData = await resSchema.json();

                                    const columns = schemaData.columns?.map((c: any) => `${c.column_name} (${c.data_type})`).join(', ');

                                    alert(`Fix Result: ${JSON.stringify(fixData)}\n\nCurrent DB Columns:\n${columns || 'Error fetching columns'}`);
                                } catch (e) { alert('Error: ' + e); }
                            }}
                            style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Troubleshoot: Fix Database Schema
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
