import { useState, useEffect } from 'react';
import { CompanyData, Opportunity } from '../lib/engine';
import { Plus, Trash, Edit, CheckCircle, AlertCircle, Save, MonitorStop, RefreshCw, X, Shield, Lock, FileText, Megaphone, Globe, Database, Bot, Activity, Eye, Sparkles, Zap, Key, BookOpen, Layers } from 'lucide-react';
import { IcpManager } from './admin/IcpManager';
import { LibraryManager } from './admin/LibraryManager';

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
    priority?: number; // 0=Unassigned, 1=Primary, 2=Secondary
    metadata?: Record<string, any>;
}

// Add Integration Modal Props
interface IntegrationModalProps {
    integration?: Integration;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export function AdminDashboard({ leads }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<'leads' | 'cms' | 'integrations' | 'users' | 'blueprints' | 'observability' | 'icps' | 'library'>('leads');
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
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);


    // Blueprint Edit State
    const [editingBlueprint, setEditingBlueprint] = useState<Opportunity | null>(null);
    const [activeUser, setActiveUser] = useState<any | null>(null);
    const [systemPrompt, setSystemPrompt] = useState<string>(''); // System Prompt State

    // Lead Edit State (Mock/Simulation for Leads View)
    const [editingUser, setEditingUser] = useState<string | null>(null); // This is "Lead ID"
    const [editForm, setEditForm] = useState<any>({});

    // UI States
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [leadsError, setLeadsError] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'leads') {
            fetchLeads();
        } else if (activeTab === 'blueprints') {
            // Fetch System Prompt with Fallback
            fetch('/api/admin/config/system-prompt', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.json();
                })
                .then(data => {
                    // Use server prompt if exists, otherwise Default
                    if (data.prompt) {
                        setSystemPrompt(data.prompt);
                    } else {
                        // DEFAULT PROMPT
                        setSystemPrompt(`You are an expert Solutions Architect. Analyze the following user profile to design high-impact automation solutions.

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
12. **Upsell**: A potential service retainer or expansion opportunity.`);
                    }
                })
                .catch(err => {
                    console.error("Failed to load prompt config", err);
                    setSystemPrompt("Error loading system prompt. Please refresh or check console.");
                });
        }
    }, [activeTab]);

    const fetchLeads = async () => {
        setIsLoadingLeads(true);
        setLeadsError(null);
        try {
            const res = await fetch('/api/admin/leads');
            if (res.ok) {
                const data = await res.json();
                console.log("Admin Leads Raw Data:", data);
                // Admin API returns { leads: [ { lead: {...}, company: {...}, user: {...} }, ... ] }
                // Map to flat structure expected by the dashboard
                const formattedLeads = (data.leads || []).map((row: any) => ({
                    id: row.lead.id,
                    userId: row.user?.id, // Add user ID for deletion
                    timestamp: row.lead.createdAt || new Date().toISOString(),
                    company: {
                        name: row.company?.name || row.user?.name || 'Anonymous',
                        email: row.user?.email || 'unknown',
                        url: row.company?.url || '',
                        industry: row.company?.industry || '',
                        role: row.company?.role || '',
                        size: row.company?.size || '',
                        painPoint: row.company?.painPoint || '',
                        stack: row.company?.stack || [],
                    },
                    recipes: row.lead.recipes || [],
                    // Keep original user object if needed
                    user: row.user
                }));
                setAdminLeads(formattedLeads);
            } else {
                setLeadsError(`Failed to fetch leads: ${res.statusText}`);
            }
        } catch (error) {
            console.error('Failed to fetch admin leads', error);
            setLeadsError("Network error fetching leads.");
        } finally {
            setIsLoadingLeads(false);
        }
    };


    const fetchUsers = async () => {
        try {
            setFetchError(null);
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            } else {
                const errText = await res.text();
                setFetchError(`Status: ${res.status} ${res.statusText} - ${errText}`);
                console.error('Fetch users failed:', res.status, errText);
            }
        } catch (error: any) {
            console.error('Failed to fetch users', error);
            setFetchError(`Network Error: ${error.message}`);
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
        } else if (activeTab === 'users') {
            fetchUsers();
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
                console.log("Stats API Response:", data);
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

    const handleDeleteLead = async (id: number) => {
        // id is now the LEAD ID
        if (confirm('Are you sure you want to delete this lead record?')) {
            try {
                // Use the new ID-based endpoint
                await fetch(`/api/admin/leads/${id}`, { method: 'DELETE' });
                fetchLeads(); // Refresh the leads list which powers the UI
            } catch (error) {
                console.error('Delete lead failed', error);
            }
        }
    };

    const handleDeleteUserReal = async (id: number) => {
        if (confirm('Are you sure you want to deactivate this user?')) {
            try {
                await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
                fetchLeads(); // Refresh the leads list which powers the UI
                fetchUsers(); // Keep users list in sync too
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
        // Hydrate form with company data + user details
        setEditForm({
            ...lead.company,
            name: lead.user?.name // Add user name to form
        });
    };

    const saveEditUser = async () => {
        if (!editingUser) return;
        try {
            // Extract name (for user) and the rest (for company)
            const { name, ...companyData } = editForm as any;

            const res = await fetch(`/api/admin/leads/${editingUser}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyData,
                    userName: name
                })
            });

            if (res.ok) {
                // Success
                await fetchLeads(); // Refresh list
                setEditingUser(null);
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) {
            alert('Failed to save changes');
        }
    };




    return (
        <div className="container animate-fade-in" style={{ paddingTop: '8rem', position: 'relative' }}>
            <header className="library-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-secondary)/0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <Shield size={48} className="text-secondary" />
                </div>
                <h2 className="text-accent" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    Admin Console <span style={{ fontSize: '1rem', opacity: 0.6, border: '1px solid currentColor', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle' }}>v3.22</span>
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

                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'hsla(var(--accent-primary)/0.1)', borderRadius: '12px' }}>
                            <Shield size={24} className="text-accent" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Admin Console</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>System Management & Oversight</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <nav style={{ background: 'hsla(var(--bg-card)/0.5)', padding: '0.25rem', borderRadius: '50px', border: '1px solid var(--border-glass)', display: 'flex' }}>
                            <button
                                onClick={() => setActiveTab('leads')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: activeTab === 'leads' ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'leads' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                                    color: activeTab === 'leads' ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <Zap size={18} /> Leads
                            </button>
                            <button
                                onClick={() => setActiveTab('cms')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: activeTab === 'cms' ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'cms' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                                    color: activeTab === 'cms' ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <FileText size={18} /> CMS
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: activeTab === 'users' ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'users' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                                    color: activeTab === 'users' ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <CheckCircle size={18} /> Users
                            </button>
                            <button
                                onClick={() => setActiveTab('integrations')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: activeTab === 'integrations' ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'integrations' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                                    color: activeTab === 'integrations' ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <Database size={18} /> Integrations
                            </button>
                            <button
                                onClick={() => setActiveTab('observability')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: activeTab === 'observability' ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'observability' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                                    color: activeTab === 'observability' ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <Activity size={18} /> Observability
                            </button>
                            <button
                                onClick={() => setActiveTab('icps')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: activeTab === 'icps' ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'icps' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                                    color: activeTab === 'icps' ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <Layers size={18} /> ICPs
                            </button>
                            <button
                                onClick={() => setActiveTab('library')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: activeTab === 'library' ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'library' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                                    color: activeTab === 'library' ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <BookOpen size={18} /> Library
                            </button>
                            <button
                                onClick={() => setActiveTab('blueprints')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: activeTab === 'blueprints' ? 'hsla(var(--accent-primary)/0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'blueprints' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                                    color: activeTab === 'blueprints' ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <Sparkles size={18} /> Config
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Observability Tab */}
            {
                activeTab === 'observability' && (
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
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'white' }}>Current Operational Mode</strong>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                                {reason}
                                            </p>
                                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                                <button
                                                    onClick={async () => {
                                                        setIsDiagnosing(true);
                                                        try {
                                                            const res = await fetch('/api/admin/usage/readiness-check', { method: 'POST' });
                                                            const report = await res.json();

                                                            let msg = `Diagnostic Report:\n`;
                                                            msg += `------------------\n`;
                                                            msg += `Integration: ${report.integration?.status === 'ok' ? '✅' : '❌'} (${report.integration?.details})\n`;
                                                            msg += `Budget: ${report.budget?.status === 'ok' ? '✅' : '❌'} (${report.budget?.details})\n`;
                                                            msg += `API Check: ${report.api_connection?.status === 'ok' ? '✅' : '❌'} (${report.api_connection?.details})\n`;
                                                            msg += `------------------\n`;
                                                            msg += `Overall Result: ${report.overall ? 'PASSED ✅' : 'FAILED ❌'}`;

                                                            alert(msg);
                                                        } catch (err) {
                                                            alert("Diagnostic Failed: " + err);
                                                        } finally {
                                                            setIsDiagnosing(false);
                                                        }
                                                    }}
                                                    disabled={isDiagnosing}
                                                    className="btn-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                >
                                                    {isDiagnosing ? <RefreshCw className="spin" size={12} /> : <Zap size={12} />}
                                                    {isDiagnosing ? 'Running Checks...' : 'Test AI Readiness'}
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        if (!confirm("This will attempt to safely create missing database tables. Continue?")) return;
                                                        try {
                                                            const res = await fetch('/api/admin/usage/fix-schema', { method: 'POST' });
                                                            const data = await res.json();
                                                            if (res.ok) alert("Schema Fix Success: " + data.message);
                                                            else alert("Schema Fix Failed: " + data.error);
                                                        } catch (e) {
                                                            alert("Error fixing schema: " + e);
                                                        }
                                                    }}
                                                    className="btn-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(255,255,255,0.1)' }}
                                                    title="Use this if you see 'api_usage' table errors"
                                                >
                                                    <Database size={12} />
                                                    Fix DB Schema
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm("This will simulate a full generation (costing ~10 cents). Continue?")) return;
                                                        setIsDiagnosing(true); // Reuse loading state
                                                        try {
                                                            const res = await fetch('/api/admin/dry-run', { method: 'POST' });
                                                            const data = await res.json();

                                                            const log = data.trace ? data.trace.join('\n') : "No trace available";
                                                            alert(data.success ? `SUCCESS!\n\n${log}` : `FAILED!\n\n${log}`);

                                                        } catch (e) {
                                                            alert("Dry Run Network Error: " + e);
                                                        } finally {
                                                            setIsDiagnosing(false);
                                                        }
                                                    }}
                                                    className="btn-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'hsla(var(--accent-primary)/0.3)', color: 'hsl(var(--accent-primary))' }}
                                                    title="Run a full pipeline test with dummy data"
                                                >
                                                    <Sparkles size={12} />
                                                    Run Full Simulation
                                                </button>
                                            </div>
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
                )
            }

            {/* Blueprints & AI Tab */}
            {
                activeTab === 'blueprints' && (
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
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    placeholder="Loading system prompt..."
                                    style={{
                                        width: '100%', minHeight: '400px',
                                        background: '#111', color: '#eee',
                                        border: '1px solid #333', borderRadius: '6px',
                                        fontFamily: 'monospace', padding: '1rem', lineHeight: '1.5'
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '1rem' }}>
                                    <button className="btn-secondary" onClick={() => {
                                        if (confirm("Reset to default prompt?")) {
                                            setSystemPrompt(`You are an expert Solutions Architect. Analyze the following user profile to design high-impact automation solutions.

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
12. **Upsell**: A potential service retainer or expansion opportunity.`);
                                        }
                                    }}>
                                        <RefreshCw size={16} /> Reset Default
                                    </button>
                                    <button className="btn-primary" onClick={async () => {
                                        try {
                                            const res = await fetch('/api/admin/config/system-prompt', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                },
                                                body: JSON.stringify({ prompt: systemPrompt })
                                            });
                                            if (res.ok) {
                                                alert("System Prompt Saved Successfully!");
                                            } else {
                                                alert("Failed to save prompt");
                                            }
                                        } catch (e) {
                                            alert("Error saving prompt: " + e);
                                        }
                                    }}>
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
                )
            }

            {/* Integrations Tab */}

            {
                activeTab === 'cms' && (
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
                )
            }

            {/* Logic for Grouping Leads */}
            {
                activeTab === 'leads' && (() => {
                    if (isLoadingLeads) {
                        return (
                            <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div className="spinner" style={{ marginBottom: '1rem' }} />
                                <p>Loading leads...</p>
                            </div>
                        );
                    }

                    if (leadsError) {
                        return (
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'salmon' }}>
                                <h3 style={{ color: 'salmon', marginBottom: '1rem' }}>Error Loading Leads</h3>
                                <p style={{ color: '#ccc' }}>{leadsError}</p>
                                <button onClick={fetchLeads} className="btn-secondary" style={{ marginTop: '1rem' }}>Try Again</button>
                            </div>
                        );
                    }

                    // Group duplicates by Email (or URL if no email)
                    const uniqueUsers = adminLeads.reduce((acc: any, row: any) => {
                        // Logic Change: Registered users grouped by User ID/Email.
                        // Anonymous users grouped by Shadow ID -> URL -> Lead ID
                        const isRegistered = !!row.user?.id;
                        const leadShadowId = row.lead?.shadowId;

                        let key;
                        if (isRegistered) {
                            key = row.user.email || row.company?.url || 'unknown_user';
                        } else {
                            // Anonymous Grouping Priority:
                            // 1. Shadow ID (Cookie) - Strongest link for anonymous users
                            // 2. URL - Weak link but better than nothing
                            // 3. Lead ID - Fallback (No grouping)
                            if (leadShadowId) {
                                key = `shadow_${leadShadowId}`;
                            } else if (row.company?.url) {
                                key = `url_${row.company.url}`;
                            } else {
                                key = row.id ? `anon_${row.id}` : `anon_unknown_${Math.random()}`;
                            }
                        }

                        if (!acc[key]) {
                            acc[key] = {
                                ...row,
                                // Use the row's specific recipe as the initial array
                                allRecipes: row.recipes ? (Array.isArray(row.recipes) ? row.recipes : [row.recipes]) : [],
                                interactionCount: 1,
                                // Explicitly mark grouping method for UI
                                groupingMethod: isRegistered ? 'user' : (leadShadowId ? 'shadow' : 'url')
                            };
                        } else {
                            // Merge recipes
                            const newRecipes = row.recipes ? (Array.isArray(row.recipes) ? row.recipes : [row.recipes]) : [];
                            acc[key].allRecipes.push(...newRecipes);
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
                                        <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                                            {user.company.name !== 'Anonymous' ? user.company.name : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    {user.groupingMethod === 'shadow' ? 'Actively Tracking' : 'Ghost User'}
                                                </span>
                                            )}
                                        </h4>
                                        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--accent-primary))' }}>
                                            {user.company.email !== 'unknown' ? user.company.email : (
                                                user.groupingMethod === 'shadow'
                                                    ? <span title={user.lead?.shadowId}>ID: {user.lead?.shadowId?.slice(0, 8)}...</span>
                                                    : user.company.url || 'No Contact Info'
                                            )}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            {user.company.role || 'Visitor'} • {user.allRecipes.length} Blueprints
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Pass LEAD ID (row.id) not userId
                                                    handleDeleteLead(user.id);
                                                }}
                                                title="Delete Lead"
                                                className="btn-danger-icon"
                                                style={{ padding: '0.25rem' }}
                                            >
                                                <Trash size={14} />
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
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        {activeUser.company.url}
                                                        {activeUser.company.scannerSource === 'AI' ? (
                                                            <span style={{ fontSize: '0.7rem', background: 'hsl(var(--accent-primary))', color: 'white', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Sparkles size={10} /> AI Enhanced
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '0.7rem', background: 'var(--border-glass)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                ⚡ System
                                                            </span>
                                                        )}
                                                        {activeUser.company.naicsCode && (
                                                            <span style={{ fontSize: '0.7rem', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                NAICS: {activeUser.company.naicsCode}
                                                            </span>
                                                        )}
                                                    </p>
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
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Industry</label>
                                                    <p>{activeUser.company.industry || 'Not specified'}</p>
                                                </div>
                                                {activeUser.company.description && (
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Analyzed Summary</label>
                                                        <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-main)' }}>{activeUser.company.description}</p>
                                                    </div>
                                                )}
                                                {activeUser.company.stack && Array.isArray(activeUser.company.stack) && activeUser.company.stack.length > 0 && (
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Detected Tech Stack</label>
                                                        <div className="chips-grid" style={{ gap: '0.25rem', marginTop: '0.25rem' }}>
                                                            {activeUser.company.stack.map((t: string) => (
                                                                <span key={t} style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border-glass)' }}>{t}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Tech Stack</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                        {(activeUser.company.stack || []).map((tech: string, i: number) => (
                                                            <span key={i} style={{
                                                                background: 'hsl(var(--accent-secondary))',
                                                                color: 'white',
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600
                                                            }}>
                                                                {tech}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 style={{ marginBottom: '1rem', color: 'hsl(var(--accent-primary))' }}>
                                            Unlocked Blueprints ({activeUser.allRecipes ? activeUser.allRecipes.length : activeUser.recipes.length})
                                        </h3>
                                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                                            {(activeUser.allRecipes || activeUser.recipes).map((r: any, idx: number) => (
                                                <div key={idx} style={{
                                                    background: 'white',
                                                    padding: '1.5rem',
                                                    borderRadius: '8px',
                                                    border: '2px solid hsl(var(--border-glass))',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <h4 style={{ fontSize: '1.1rem', margin: 0, color: 'hsl(var(--text-main))' }}>{r.title}</h4>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!confirm(`Are you sure you want to delete "${r.title}"?`)) return;
                                                                    try {
                                                                        // New Endpoint for specific recipe deletion
                                                                        const res = await fetch(`/api/admin/leads/${activeUser.id}/recipes`, {
                                                                            method: 'DELETE',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ title: r.title })
                                                                        });
                                                                        if (res.ok) {
                                                                            // Refresh the leads data to update the UI
                                                                            fetchLeads();
                                                                        } else {
                                                                            alert("Failed to delete recipe");
                                                                        }
                                                                    } catch (err) {
                                                                        alert("Error deleting recipe: " + err);
                                                                    }
                                                                }}
                                                                className="btn-danger-icon"
                                                                title="Delete Blueprint"
                                                                style={{ padding: '0.25rem' }}
                                                            >
                                                                <Trash size={14} />
                                                            </button>
                                                            <span className="badge" style={{ background: 'hsl(var(--accent-primary))', color: 'white' }}>{r.department}</span>
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
                                                            </span>
                                                            {r.generation_metadata?.fallback_reason && (
                                                                <span style={{ color: 'salmon', marginLeft: '0.5rem' }}>
                                                                    ⚠️ {r.generation_metadata.fallback_reason}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Recipe Card Details */}
                                                    <div style={{ display: 'grid', gap: '1rem', fontSize: '0.9rem' }}>
                                                        {/* Public View Section */}
                                                        <div style={{ background: 'hsl(var(--bg-secondary))', padding: '1rem', borderRadius: '6px', border: '1px solid hsl(var(--border-glass))' }}>
                                                            <h5 style={{ margin: '0 0 0.75rem 0', color: 'hsl(var(--accent-primary))', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Public View</h5>

                                                            <div style={{ marginBottom: '0.75rem' }}>
                                                                <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Problem</label>
                                                                <p style={{ margin: 0, color: 'hsl(var(--text-main))', lineHeight: 1.5 }}>{r.public_view?.problem || 'N/A'}</p>
                                                            </div>

                                                            <div style={{ marginBottom: '0.75rem' }}>
                                                                <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Solution</label>
                                                                <p style={{ margin: 0, color: 'hsl(var(--text-main))', lineHeight: 1.5 }}>{r.public_view?.solution_narrative || 'N/A'}</p>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                                <div>
                                                                    <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Value Proposition</label>
                                                                    <p style={{ margin: 0, color: 'hsl(var(--text-main))', lineHeight: 1.5 }}>{r.public_view?.value_proposition || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>ROI Estimate</label>
                                                                    <p style={{ margin: 0, color: 'hsl(140, 70%, 50%)', fontWeight: 600, lineHeight: 1.5 }}>{r.public_view?.roi_estimate || 'N/A'}</p>
                                                                </div>
                                                            </div>

                                                            {r.public_view?.detailed_explanation && (
                                                                <div style={{ marginTop: '0.75rem' }}>
                                                                    <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Detailed Explanation</label>
                                                                    <p style={{ margin: 0, color: 'hsl(var(--text-main))', lineHeight: 1.5, fontSize: '0.85rem' }}>{r.public_view.detailed_explanation}</p>
                                                                </div>
                                                            )}

                                                            {r.public_view?.walkthrough_steps && r.public_view.walkthrough_steps.length > 0 && (
                                                                <div style={{ marginTop: '0.75rem' }}>
                                                                    <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Walkthrough Steps</label>
                                                                    <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0, color: 'hsl(var(--text-main))', lineHeight: 1.6 }}>
                                                                        {(Array.isArray(r.public_view.walkthrough_steps) ? r.public_view.walkthrough_steps : []).map((step: string, i: number) => (
                                                                            <li key={i} style={{ fontSize: '0.85rem' }}>{step}</li>
                                                                        ))}
                                                                    </ol>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Admin View Section */}
                                                        <div style={{ background: 'hsl(var(--bg-secondary))', padding: '1rem', borderRadius: '6px', border: '1px solid hsl(var(--border-glass))' }}>
                                                            <h5 style={{ margin: '0 0 0.75rem 0', color: 'hsl(var(--accent-gold))', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin View</h5>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                                                                <div>
                                                                    <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Implementation Difficulty</label>
                                                                    <span style={{
                                                                        display: 'inline-block',
                                                                        padding: '0.25rem 0.75rem',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 600,
                                                                        background: r.admin_view?.implementation_difficulty === 'Low' ? 'hsl(140, 70%, 90%)' :
                                                                            r.admin_view?.implementation_difficulty === 'Med' ? 'hsl(45, 90%, 85%)' :
                                                                                'hsl(0, 70%, 90%)',
                                                                        color: r.admin_view?.implementation_difficulty === 'Low' ? 'hsl(140, 70%, 30%)' :
                                                                            r.admin_view?.implementation_difficulty === 'Med' ? 'hsl(45, 90%, 30%)' :
                                                                                'hsl(0, 70%, 30%)'
                                                                    }}>
                                                                        {r.admin_view?.implementation_difficulty || 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Tech Stack</label>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                                        {(r.admin_view?.stack_details || (Array.isArray(r.admin_view?.tech_stack) ? r.admin_view.tech_stack : []).map((t: string) => ({ tool: t, role: 'Core Integration' }))).slice(0, 3).map((detail: any, i: number) => (
                                                                            <span key={i} style={{
                                                                                fontSize: '0.75rem',
                                                                                background: 'hsl(var(--accent-secondary))',
                                                                                color: 'white',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '3px',
                                                                                fontWeight: 600
                                                                            }}>
                                                                                {detail.tool}
                                                                            </span>
                                                                        ))}
                                                                        {(r.admin_view?.stack_details || (Array.isArray(r.admin_view?.tech_stack) ? r.admin_view.tech_stack : [])).length > 3 && (
                                                                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                                                +{(r.admin_view?.stack_details || (Array.isArray(r.admin_view?.tech_stack) ? r.admin_view.tech_stack : [])).length - 3} more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ marginBottom: '0.75rem' }}>
                                                                <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Workflow Steps</label>
                                                                <p style={{ margin: 0, color: 'hsl(var(--text-main))', lineHeight: 1.5, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{r.admin_view?.workflow_steps || 'N/A'}</p>
                                                            </div>

                                                            <div>
                                                                <label style={{ color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>Upsell Opportunity</label>
                                                                <p style={{ margin: 0, color: 'hsl(140, 70%, 50%)', fontWeight: 600, lineHeight: 1.5 }}>{r.admin_view?.upsell_opportunity || 'N/A'}</p>
                                                            </div>
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
                })()
            }

            {/* Blueprint Editor Modal */}
            {
                editingBlueprint && (
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
                )
            }

            {/* Edit Lead/User Modal */}
            {
                editingUser && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem' }}>Edit Lead Profile</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ID: {editingUser}</p>
                                </div>
                                <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>
                            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>

                                {/* Name Input (Updates User Name if registered) */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Name (User / Lead)</label>
                                    <input
                                        type="text"
                                        value={editForm.name || ''}
                                        onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder={editForm.name ? '' : 'Anonymous'}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: 'white' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Company URL</label>
                                        <input
                                            type="text"
                                            value={editForm.url || ''}
                                            onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Industry</label>
                                        <input
                                            type="text"
                                            value={editForm.industry || ''}
                                            onChange={e => setEditForm({ ...editForm, industry: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Role</label>
                                        <input
                                            type="text"
                                            value={editForm.role || ''}
                                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Company Size</label>
                                        <select
                                            value={editForm.size || ''}
                                            onChange={e => setEditForm({ ...editForm, size: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: 'white' }}
                                        >
                                            <option value="">Select Size</option>
                                            <option value="1-10">1-10</option>
                                            <option value="11-50">11-50</option>
                                            <option value="51-200">51-200</option>
                                            <option value="201-500">201-500</option>
                                            <option value="500+">500+</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>NAICS Code</label>
                                        <input
                                            type="text"
                                            value={editForm.naicsCode || ''}
                                            onChange={e => setEditForm({ ...editForm, naicsCode: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Data Source</label>
                                        <select
                                            value={editForm.scannerSource || 'System'}
                                            onChange={e => setEditForm({ ...editForm, scannerSource: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: 'white' }}
                                        >
                                            <option value="System">System / Manual</option>
                                            <option value="AI">AI Scanner</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pain Point</label>
                                    <textarea
                                        value={editForm.painPoint || ''}
                                        onChange={e => setEditForm({ ...editForm, painPoint: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', minHeight: '60px', background: '#111', color: 'white' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Business Description / Summary</label>
                                    <textarea
                                        value={editForm.description || ''}
                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', minHeight: '80px', background: '#111', color: 'white' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tech Stack (Comma Separated)</label>
                                    <input
                                        type="text"
                                        value={Array.isArray(editForm.stack) ? editForm.stack.join(', ') : (editForm.stack || '')}
                                        onChange={e => {
                                            // Split by comma for simple editing
                                            const val = e.target.value;
                                            setEditForm({ ...editForm, stack: val.split(',').map(s => s.trim()) });
                                        }}
                                        placeholder="React, Node.js, AWS..."
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: '#111', color: 'white' }}
                                    />
                                </div>

                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                                <button onClick={() => setEditingUser(null)} className="btn-secondary">Cancel</button>
                                <button onClick={saveEditUser} className="btn-primary">
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                activeTab === 'integrations' && (
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
                                            <button
                                                onClick={() => handleTestConnection(i.id)}
                                                disabled={testingId === i.id}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    marginRight: '1rem'
                                                }}
                                                title="Test Connection"
                                            >
                                                <RefreshCw size={16} className={testingId === i.id ? "spin" : ""} />
                                            </button>
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
                )
            }
            {/* Users Tab - Real User Management */}
            {
                activeTab === 'users' && (
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <h3>Registered Users <span style={{ fontSize: '0.8rem', color: '#888' }}>({users.length})</span></h3>
                                <button onClick={fetchUsers} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                                    <RefreshCw size={12} /> Force Refresh
                                </button>
                            </div>
                            <button onClick={() => openEditUserModal()} className="btn-primary">
                                <Plus size={18} /> Add User
                            </button>
                        </div>

                        {/* Debug Raw State */}
                        {(users.length === 0 || fetchError) && (
                            <div style={{ padding: '1rem', background: 'rgba(255,100,100,0.1)', border: '1px solid salmon', borderRadius: '8px', marginBottom: '1rem' }}>
                                <p style={{ color: 'salmon', marginBottom: '0.5rem' }}>⚠️ Debug info:</p>
                                <pre style={{ fontSize: '0.7rem', color: '#ccc' }}>
                                    Active Tab: {activeTab}{'\n'}
                                    Users State Array Length: {users.length}{'\n'}
                                    Fetch Error: {fetchError || 'None'}
                                </pre>
                            </div>
                        )}

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
                )
            }

            {/* Edit/Create User Modal */}
            {
                isEditingRealUser && (
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
                )
            }

            {activeTab === 'icps' && <IcpManager />}
            {activeTab === 'library' && <LibraryManager />}

            {/* Integration Modal */}
            {
                isEditingIntegration && (
                    <IntegrationModal
                        integration={currentIntegration || undefined}
                        onClose={() => setIsEditingIntegration(false)}
                        onSave={handleSaveIntegration}
                    />
                )
            }
        </div >
    );
}

function IntegrationModal({ integration, onClose, onSave }: IntegrationModalProps) {
    const [name, setName] = useState(integration?.name || '');
    const [authType, setAuthType] = useState(integration?.authType || 'api_key');
    const [baseUrl, setBaseUrl] = useState(integration?.baseUrl || '');
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState(integration?.enabled ?? true);
    const [priority, setPriority] = useState(integration?.priority || 0);

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
            priority,
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
                            <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Failover Priority</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            >
                                <option value={0}>No Priority (Pool)</option>
                                <option value={1}>Primary (1st)</option>
                                <option value={2}>Secondary (Backup)</option>
                                <option value={9}>Last Resort</option>
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
