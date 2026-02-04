import { useState, useEffect } from 'react';
import { CompanyData, Opportunity } from '../lib/engine';
import { Plus, Trash, Edit, CheckCircle, AlertCircle, Save, MonitorStop, RefreshCw, X, Shield, ShieldCheck, FileText, Megaphone, Globe, Database, Bot, Activity, Sparkles, Zap, Key, BookOpen, Layers, User, Users } from 'lucide-react';
import { IcpManager } from './admin/IcpManager';
import { LibraryManager } from './admin/LibraryManager';

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

export function AdminDashboard() {
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
    const [systemPrompt, setSystemPrompt] = useState<string>(''); // System Prompt State

    // Lead Edit State (Mock/Simulation for Leads View)
    const [editingUser, setEditingUser] = useState<string | null>(null); // This is "Lead ID"
    const [editForm, setEditForm] = useState<any>({});

    // UI States
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [isScanning, setIsScanning] = useState(false); // Fix: Add missing state
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
            const res = await fetch('/api/admin/integrations/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                const data = await res.json();
                alert(data.message || 'Connection Successful! ✅');
            } else {
                const data = await res.json();
                alert(`Connection Failed: ${data.details || data.error || 'Unknown Error'} ❌`);
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
        const sampleOpps = await generateOpportunities(dummyData);

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


    const handleScan = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!editForm.url) return;

        setIsScanning(true);
        try {
            const res = await fetch('/api/scan-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: editForm.url })
            });
            const data = await res.json();

            if (data.success && data.data) {
                // Auto-fill form
                setEditForm((prev: any) => ({
                    ...prev,
                    industry: data.data.industry || prev.industry,
                    // If AI gives description, use it? Or keep existing?
                    // Maybe prompt user? For now just overwrite if empty?
                    // Let's just overwrite for now as it's an explicit action.
                    description: data.data.description || prev.description,
                    naicsCode: data.data.context?.naics || prev.naicsCode,
                    // Also stack?
                    stack: Array.from(new Set([...(prev.stack || []), ...(data.data.stack || [])])),

                    // Store internal metadata if useful
                    scannerSource: data.data.context?.source || 'System'
                }));
            } else {
                alert('Scan failed to find relevant data.');
            }
        } catch (error) {
            console.error(error);
            alert('Scan failed.');
        } finally {
            setIsScanning(false);
        }
    };

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

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => {
                            fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
                                window.location.href = '/login';
                            });
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-glass)' }}
                    >
                        <MonitorStop size={14} /> Log Out
                    </button>
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

            {/* Observability Tab */}
            {
                activeTab === 'observability' && (
                    <div className="admin-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                        <div className="admin-page-header">
                            <h3 className="admin-page-title">
                                <Activity size={24} className="text-accent" /> AI Usage & Budget
                            </h3>
                            <button
                                onClick={fetchUsageStats}
                                className="btn-secondary"
                                title="Refresh"
                            >
                                <RefreshCw size={16} /> Refresh
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            {/* Budget Card */}
                            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}>
                                <label className="admin-label">Daily Budget Limit</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 700, color: 'hsl(var(--text-main))' }}>${usageStats?.limit?.toFixed(2) || '0.00'}</span>
                                    {isUpdatingLimit ? (
                                        <span className="status-badge info">Updating...</span>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const newLimit = prompt("Set new daily limit in USD (e.g., 5.00):", usageStats?.limit?.toString());
                                                if (newLimit && !isNaN(parseFloat(newLimit))) {
                                                    handleUpdateLimit(parseFloat(newLimit));
                                                }
                                            }}
                                            className="btn-secondary btn-sm"
                                        >
                                            <Edit size={12} /> Edit
                                        </button>
                                    )}
                                </div>
                                <div style={{ marginTop: '0.5rem', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(((usageStats?.spend || 0) / (usageStats?.limit || 1)) * 100, 100)}%`,
                                        background: (usageStats?.spend || 0) > (usageStats?.limit || 0) ? 'salmon' : 'hsl(var(--accent-primary))',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>
                                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 500, color: (usageStats?.spend || 0) > (usageStats?.limit || 0) ? 'salmon' : 'var(--text-muted)' }}>
                                    ${usageStats?.spend?.toFixed(4)} used today
                                </p>
                            </div>

                            {/* Request Count Card */}
                            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}>
                                <label className="admin-label">Total Requests Today</label>
                                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'hsl(var(--text-main))' }}>
                                    {usageStats?.requests || 0}
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                    Across all users and endpoints
                                </p>
                            </div>
                        </div>

                        {/* System Forecast / Diagnostic */}
                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
                                <Activity size={18} /> System Forecast
                            </h4>

                            {(() => {
                                const hasActiveIntegration = integrations.some(i => i.enabled);
                                const budgetExceeded = (usageStats?.spend || 0) >= (usageStats?.limit || 100);

                                // Determine State
                                let status = 'System (Fallback)';
                                let color = 'salmon';
                                let reason = 'Unknown Error';
                                let bg = 'rgba(250, 128, 114, 0.1)';

                                if (!hasActiveIntegration) {
                                    status = 'System (Fallback)';
                                    color = 'orange';
                                    bg = 'rgba(255, 165, 0, 0.1)';
                                    reason = 'No active AI integrations found. Navigate to the Integrations tab to connect a provider.';
                                } else if (budgetExceeded) {
                                    status = 'System (Fallback)';
                                    color = 'salmon';
                                    bg = 'rgba(250, 128, 114, 0.1)';
                                    reason = `Daily budget limit ($${usageStats?.limit}) has been reached relative to current spend ($${usageStats?.spend}).`;
                                } else {
                                    status = 'AI (Live Generation)';
                                    color = 'hsl(140, 70%, 40%)';
                                    bg = 'hsla(140, 70%, 40%, 0.1)';
                                    reason = 'System is healthy. Active Integration found and budget is sufficient for new runs.';
                                }

                                return (
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                        <div style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '6px',
                                            background: bg,
                                            border: `1px solid ${color}`,
                                            color: color,
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {status}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'hsl(var(--text-main))' }}>Current Operational Mode</strong>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                                {reason}
                                            </p>
                                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
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
                                                    className="btn-secondary btn-sm"
                                                >
                                                    {isDiagnosing ? <RefreshCw className="spin" size={14} /> : <Zap size={14} />}
                                                    {isDiagnosing ? ' Checking...' : ' Test Readiness'}
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
                                                    className="btn-secondary btn-sm"
                                                    title="Use this if you see 'api_usage' table errors"
                                                >
                                                    <Database size={14} /> Fix Schema
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
                                                    className="btn-secondary btn-sm"
                                                    style={{ borderColor: 'hsl(var(--accent-primary))', color: 'hsl(var(--accent-primary))' }}
                                                >
                                                    <Sparkles size={14} /> Run Simulation
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Shield size={16} /> Budget Enforcement
                            </h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                When the daily limit is reached, all AI Generation requests will automatically fall back to static templates to prevent overage charges.
                            </p>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={16} className="text-accent" /> Hard Limit Active
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={16} className="text-accent" /> Admin Notifications (Coming Soon)
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
                    <div className="admin-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                        <div className="admin-page-header">
                            <div>
                                <h3 className="admin-page-title">
                                    <Sparkles size={24} className="text-accent" /> AI Generation Config
                                </h3>
                                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Manage the system prompt and blueprint templates.
                                </p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '3rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <label className="admin-label" style={{ fontSize: '1rem' }}>System Prompt Template</label>
                                <span className="status-badge" style={{ fontSize: '0.75rem' }}>Core Logic</span>
                            </div>

                            <textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="Loading system prompt..."
                                className="admin-textarea"
                                style={{
                                    minHeight: '400px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6',
                                    background: '#1e293b',
                                    color: '#e2e8f0',
                                    border: '1px solid #334155'
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

                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
                            <Database size={20} /> Managed Blueprints
                        </h3>

                        {/* Mock List of Core Blueprints */}
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {['The Silent Assistant', 'The Invoice Watchdog', 'The Omni-Channel Nurture', 'The Project Pulse'].map((name, i) => (
                                <div key={i} className="admin-list-item" style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem 1.5rem',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-glass)',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: i % 2 === 0 ? 'hsla(var(--accent-primary)/0.1)' : 'hsla(var(--accent-gold)/0.1)',
                                            color: i % 2 === 0 ? 'hsl(var(--accent-primary))' : 'hsl(var(--accent-gold))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                        }}>
                                            {i + 1}
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>{name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <span className={`status-badge ${i % 2 === 0 ? 'info' : 'warning'}`}>{i % 2 === 0 ? 'Core' : 'Advanced'}</span>
                                        <button className="btn-secondary btn-sm" title="Edit Template" onClick={() => handleEditBlueprint(name)}>
                                            <Edit size={14} /> Edit
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
                    <div className="admin-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                        <div className="admin-page-header">
                            <div>
                                <h3 className="admin-page-title">
                                    <Megaphone size={24} className="text-accent" /> Landing Page Announcement
                                </h3>
                                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Display a system-wide message on the onboarding page.
                                </p>
                            </div>
                            <div className={`status-badge ${cmsStatus === 'published' ? 'success' : 'neutral'}`} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                                {cmsStatus === 'published' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {cmsStatus === 'published' ? 'Live' : 'Draft'}
                            </div>
                        </div>

                        {isEditingCms ? (
                            <div className="animate-fade-in" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                                <label className="admin-label">Announcement Text</label>
                                <textarea
                                    value={announcement}
                                    onChange={(e) => setAnnouncement(e.target.value)}
                                    placeholder="e.g., 'System Maintenance: Saturday 2am' or 'Welcome to the Beta!'"
                                    className="admin-textarea"
                                    style={{
                                        minHeight: '150px',
                                        marginBottom: '1.5rem'
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                                    <button onClick={() => setIsEditingCms(false)} className="btn-ghost">
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
                                    padding: '2rem',
                                    background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
                                    borderRadius: '12px',
                                    marginBottom: '1.5rem',
                                    minHeight: '120px',
                                    border: '1px solid var(--border-glass)',
                                    display: 'flex', alignItems: announcement ? 'flex-start' : 'center',
                                    justifyContent: announcement ? 'flex-start' : 'center',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    {announcement ? (
                                        <p style={{ whiteSpace: 'pre-wrap', fontSize: '1.1rem', color: 'hsl(var(--text-main))' }}>{announcement}</p>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No announcement set.</p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button
                                        onClick={handleDeleteMessage}
                                        style={{ color: 'salmon', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                                    >
                                        <Trash size={16} /> Delete Message
                                    </button>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {cmsStatus === 'published' && (
                                            <button onClick={handleUnpublish} className="btn-secondary">
                                                Unpublish
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
                                {showSaveConfirm && <p className="animate-fade-in" style={{ textAlign: 'right', marginTop: '0.5rem', color: 'hsl(140, 70%, 40%)', fontSize: '0.9rem', fontWeight: 500 }}>Changes saved!</p>}
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
                            <div className="admin-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div className="spinner" style={{ marginBottom: '1rem' }} />
                                <p>Loading leads...</p>
                            </div>
                        );
                    }

                    if (leadsError) {
                        return (
                            <div className="admin-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'salmon' }}>
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
                                allRecipes: row.recipes ? (Array.isArray(row.recipes) ? row.recipes : [row.recipes]) : [],
                                interactionCount: 1,
                                groupingMethod: isRegistered ? 'user' : (leadShadowId ? 'shadow' : 'url')
                            };
                        } else {
                            const newRecipes = row.recipes ? (Array.isArray(row.recipes) ? row.recipes : [row.recipes]) : [];
                            acc[key].allRecipes.push(...newRecipes);
                            acc[key].interactionCount += 1;
                        }
                        return acc;
                    }, {} as Record<string, any>);

                    const userList = Object.values(uniqueUsers);
                    // Use 'any' cast to avoid TS errors for now during UI polish
                    const activeUser = userList.find((u: any) => u.id === selectedLead) as any;

                    return (
                        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', height: 'calc(100vh - 140px)' }}>
                            {/* Sidebar List */}
                            <div className="admin-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-glass)', background: '#f8fafc' }}>
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Registered Users ({userList.length})
                                    </h3>
                                </div>
                                <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                                    {userList.length === 0 && <p style={{ padding: '1rem', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>No users found.</p>}
                                    {userList.map((user: any) => (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedLead(user.id);
                                            }}
                                            className={`admin-list-item ${selectedLead === user.id ? 'active' : ''}`}
                                            style={{
                                                padding: '1rem',
                                                cursor: 'pointer',
                                                borderRadius: '8px',
                                                marginBottom: '0.25rem',
                                                border: selectedLead === user.id ? '1px solid hsl(var(--accent-primary))' : '1px solid transparent',
                                                background: selectedLead === user.id ? 'hsla(var(--accent-primary)/0.05)' : 'transparent'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: selectedLead === user.id ? 'hsl(var(--accent-primary))' : 'hsl(var(--text-main))' }}>
                                                    {user.user?.name || user.company?.url || 'Anonymous'}
                                                </h4>
                                                {user.allRecipes.length > 0 && <span className="badge" style={{ fontSize: '0.7rem' }}>{user.allRecipes.length}</span>}
                                            </div>

                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {user.user?.email || (user.groupingMethod === 'shadow' ? `ID: ${user.lead?.shadowId?.slice(0, 8)}...` : (user.company?.url || 'No Contact Info'))}
                                            </p>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.company?.role || 'Visitor'}</span>
                                                <div style={{ display: 'flex', gap: '0.25rem', opacity: 0.6 }}>
                                                    <button
                                                        onClick={(e) => openEditUser(user, e)}
                                                        className="btn-ghost"
                                                        style={{ padding: '2px', height: '20px', width: '20px' }}
                                                        title="Edit"
                                                    >
                                                        <Edit size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteLead(user.id);
                                                        }}
                                                        className="btn-ghost user-delete-btn"
                                                        style={{ padding: '2px', height: '20px', width: '20px', color: 'salmon' }}
                                                        title="Delete"
                                                    >
                                                        <Trash size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Main Detail View */}
                            <div className="admin-panel animate-fade-in" style={{ padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                {activeUser ? (
                                    <div className="animate-fade-in">
                                        <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h1 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', color: 'hsl(var(--text-main))' }}>
                                                        {activeUser.user?.name || activeUser.company?.url || "Anonymous User"}
                                                    </h1>
                                                    {activeUser.user?.email && (
                                                        <p style={{ color: 'hsl(var(--accent-primary))', fontSize: '1.1rem', fontWeight: 500 }}>{activeUser.user.email}</p>
                                                    )}

                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                        {activeUser.company?.url && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                                                <Globe size={12} /> {activeUser.company.url}
                                                            </span>
                                                        )}

                                                        {activeUser.company?.scannerSource === 'AI' ? (
                                                            <span className="status-badge info" style={{ fontSize: '0.75rem' }}>
                                                                <Sparkles size={10} /> AI Enhanced
                                                            </span>
                                                        ) : (
                                                            <span className="status-badge" style={{ fontSize: '0.75rem' }}>
                                                                ⚡ System
                                                            </span>
                                                        )}

                                                        {activeUser.company?.naicsCode && (
                                                            <span style={{ fontSize: '0.75rem', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px' }}>
                                                                NAICS: {activeUser.company.naicsCode}
                                                            </span>
                                                        )}

                                                        {activeUser.lead?.id && (
                                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lead #{activeUser.lead.id}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <button onClick={(e) => openEditUser(activeUser, e)} className="btn-secondary">
                                                        <Edit size={16} /> Edit Profile
                                                    </button>
                                                    {activeUser.user && (
                                                        <button onClick={(e) => handleResetPassword(activeUser.user.id, e)} className="btn-secondary">
                                                            <Key size={16} /> Reset PWD
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Company Details Grid */}
                                            {activeUser.company && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', marginTop: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                                                    <div>
                                                        <label className="admin-label">Role</label>
                                                        <p style={{ fontWeight: 500 }}>{activeUser.company.role || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="admin-label">Company Size</label>
                                                        <p style={{ fontWeight: 500 }}>{activeUser.company.size || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="admin-label">Industry</label>
                                                        <p style={{ fontWeight: 500 }}>{activeUser.company.industry || 'Not specified'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="admin-label">Pain Point</label>
                                                        <p className="truncate-2" title={activeUser.company.painPoint || ''} style={{ fontSize: '0.9rem' }}>"{activeUser.company.painPoint || 'N/A'}"</p>
                                                    </div>

                                                    {activeUser.company.description && (
                                                        <div style={{ gridColumn: 'span 4' }}>
                                                            <label className="admin-label">Analyzed Summary</label>
                                                            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)', marginTop: '0.25rem' }}>{activeUser.company.description}</p>
                                                        </div>
                                                    )}

                                                    {activeUser.company.stack && Array.isArray(activeUser.company.stack) && activeUser.company.stack.length > 0 && (
                                                        <div style={{ gridColumn: 'span 4' }}>
                                                            <label className="admin-label">Detected Tech Stack</label>
                                                            <div className="chips-grid" style={{ gap: '0.5rem', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap' }}>
                                                                {activeUser.company.stack.map((t: string) => (
                                                                    <span key={t} style={{ background: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-glass)', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{t}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                                            <Database size={20} className="text-accent" /> Unlocked Blueprints <span className="badge" style={{ fontSize: '0.8rem' }}>{activeUser.allRecipes ? activeUser.allRecipes.length : activeUser.recipes?.length || 0}</span>
                                        </h3>
                                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                                            {(activeUser.allRecipes || activeUser.recipes).map((r: any, idx: number) => (
                                                <div key={idx} className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
                                                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                                <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'hsl(var(--text-main))' }}>{r.title}</h4>
                                                                <span className="badge" style={{ background: 'hsl(var(--accent-primary))', color: 'white' }}>{r.department}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {r.industry && <span>{r.industry}</span>}
                                                                <span>•</span>
                                                                <span>{r.generation_metadata?.source || 'System'}</span>
                                                                {r.generation_metadata?.fallback_reason && (
                                                                    <span style={{ color: 'salmon', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <AlertCircle size={10} /> Fallback
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (!confirm(`Are you sure you want to delete "${r.title}"?`)) return;
                                                                try {
                                                                    const res = await fetch(`/api/admin/leads/${activeUser.id}/recipes`, {
                                                                        method: 'DELETE',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ title: r.title })
                                                                    });
                                                                    if (res.ok) {
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
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </div>

                                                    <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                                                        {/* Public View */}
                                                        <div>
                                                            <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.05em', fontWeight: 700 }}>Public View</h5>
                                                            <div style={{ marginBottom: '1rem' }}>
                                                                <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Problem</strong>
                                                                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>{r.public_view?.problem || 'N/A'}</p>
                                                            </div>
                                                            <div style={{ marginBottom: '1rem' }}>
                                                                <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Solution</strong>
                                                                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>{r.public_view?.solution_narrative || 'N/A'}</p>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                                <div>
                                                                    <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Value Prop</strong>
                                                                    <p style={{ fontSize: '0.9rem', margin: 0 }}>{r.public_view?.value_proposition || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>ROI</strong>
                                                                    <p style={{ fontSize: '0.9rem', margin: 0, color: 'hsl(140, 70%, 40%)', fontWeight: 600 }}>{r.public_view?.roi_estimate || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Admin View / Technical */}
                                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                                            <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'hsl(var(--accent-primary))', marginBottom: '1rem', letterSpacing: '0.05em', fontWeight: 700 }}>Technical Details</h5>

                                                            <div style={{ marginBottom: '1rem' }}>
                                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Difficulty</label>
                                                                <span className={`status-badge ${r.admin_view?.implementation_difficulty === 'Low' ? 'success' : r.admin_view?.implementation_difficulty === 'High' ? 'warning' : 'info'}`}>
                                                                    {r.admin_view?.implementation_difficulty || 'Unknown'}
                                                                </span>
                                                            </div>

                                                            <div style={{ marginBottom: '1rem' }}>
                                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Upsell Opportunity</label>
                                                                <p style={{ margin: 0, fontWeight: 500, color: 'hsl(var(--accent-primary))' }}>{r.admin_view?.upsell_opportunity || 'N/A'}</p>
                                                            </div>

                                                            <div>
                                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Tech Stack</label>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                                    {(r.admin_view?.stack_details || (Array.isArray(r.admin_view?.tech_stack) ? r.admin_view.tech_stack : []).map((t: string) => ({ tool: t }))).slice(0, 5).map((detail: any, i: number) => (
                                                                        <span key={i} style={{ fontSize: '0.75rem', background: 'white', border: '1px solid var(--border-glass)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                            {detail.tool}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ background: '#f1f5f9', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                            <User size={48} style={{ opacity: 0.3 }} />
                                        </div>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Select a user to view their activity history.</p>
                                        <p style={{ fontSize: '0.9rem' }}>Choose from the list on the left.</p>
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
                    <div className="admin-modal-overlay" onClick={() => setEditingBlueprint(null)}>
                        <div
                            className="admin-modal-content animate-scale-in"
                            style={{ maxWidth: '850px' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="admin-modal-header">
                                <h3>
                                    <Sparkles size={24} style={{ marginRight: '0.75rem', verticalAlign: 'middle', color: 'hsl(var(--accent-primary))' }} />
                                    Refine Logic Blueprint
                                </h3>
                                <button
                                    onClick={() => setEditingBlueprint(null)}
                                    className="admin-btn-close"
                                    aria-label="Close modal"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="admin-modal-body">
                                <div className="admin-form-grid">
                                    <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="bp-title" className="admin-label">Blueprint Title</label>
                                        <input
                                            id="bp-title"
                                            className="admin-input"
                                            value={editingBlueprint.title}
                                            onChange={(e) => setEditingBlueprint({ ...editingBlueprint, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="bp-department" className="admin-label">Target Department</label>
                                        <input
                                            id="bp-department"
                                            className="admin-input"
                                            value={editingBlueprint.department}
                                            onChange={(e) => setEditingBlueprint({ ...editingBlueprint, department: e.target.value })}
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="bp-roi" className="admin-label">Estimated ROI / Savings</label>
                                        <input
                                            id="bp-roi"
                                            className="admin-input"
                                            value={editingBlueprint.public_view?.roi_estimate || ''}
                                            onChange={(e) => setEditingBlueprint({ ...editingBlueprint, public_view: { ...editingBlueprint.public_view, roi_estimate: e.target.value } })}
                                        />
                                    </div>

                                    <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="bp-problem" className="admin-label">Problem Statement</label>
                                        <textarea
                                            id="bp-problem"
                                            className="admin-textarea"
                                            rows={2}
                                            value={editingBlueprint.public_view?.problem || ''}
                                            onChange={(e) => setEditingBlueprint({ ...editingBlueprint, public_view: { ...editingBlueprint.public_view, problem: e.target.value } })}
                                        />
                                    </div>

                                    <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="bp-solution" className="admin-label">Solution Narrative</label>
                                        <textarea
                                            id="bp-solution"
                                            className="admin-textarea"
                                            rows={3}
                                            value={editingBlueprint.public_view?.solution_narrative || ''}
                                            onChange={(e) => setEditingBlueprint({ ...editingBlueprint, public_view: { ...editingBlueprint.public_view, solution_narrative: e.target.value } })}
                                        />
                                    </div>

                                    <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="bp-walkthrough" className="admin-label">Implementation Steps (One per line)</label>
                                        <textarea
                                            id="bp-walkthrough"
                                            className="admin-textarea"
                                            rows={5}
                                            value={editingBlueprint.public_view?.walkthrough_steps?.join('\n') || ''}
                                            onChange={e => {
                                                const steps = e.target.value.split('\n');
                                                setEditingBlueprint({ ...editingBlueprint, public_view: { ...editingBlueprint.public_view, walkthrough_steps: steps } })
                                            }}
                                        />
                                    </div>

                                    <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="admin-label">Integration Stack Mapping</label>
                                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                                            {editingBlueprint.admin_view?.stack_details?.map((detail, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '0.75rem' }}>
                                                    <div>
                                                        <label className="admin-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem', opacity: 0.6 }}>Logic Tool</label>
                                                        <input value={detail.tool} readOnly className="admin-input" style={{ background: '#f1f5f9', color: '#64748b' }} />
                                                    </div>
                                                    <div>
                                                        <label className="admin-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem', opacity: 0.6 }}>Agentic Role / Workflow</label>
                                                        <input
                                                            className="admin-input"
                                                            value={detail.role}
                                                            onChange={(e) => {
                                                                const newDetails = [...(editingBlueprint.admin_view.stack_details || [])];
                                                                newDetails[idx].role = e.target.value;
                                                                setEditingBlueprint({ ...editingBlueprint, admin_view: { ...editingBlueprint.admin_view, stack_details: newDetails } });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {(!editingBlueprint.admin_view?.stack_details || editingBlueprint.admin_view.stack_details.length === 0) && (
                                                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No stack mapping available.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-modal-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.25rem', width: '100%' }}>
                                    <button onClick={() => setEditingBlueprint(null)} className="admin-btn-secondary">Discard changes</button>
                                    <button onClick={handleSaveBlueprint} className="admin-btn-primary" style={{ padding: '0.875rem 2.5rem' }}>
                                        <Save size={18} style={{ marginRight: '0.5rem' }} /> Update Blueprint
                                    </button>
                                </div>

                                <div style={{
                                    borderTop: '1px solid #f1f5f9',
                                    paddingTop: '1rem',
                                    textAlign: 'center',
                                    fontSize: '0.75rem',
                                    color: '#94a3b8',
                                    lineHeight: '1.4'
                                }}>
                                    <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                                        Authorized Use Only
                                    </p>
                                    <p>
                                        This system processes proprietary strategy data. All activities are logged for compliance and security monitoring.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Lead/User Modal */}
            {
                editingUser && (
                    <div className="admin-modal-overlay" onClick={() => setEditingUser(null)}>
                        <div
                            className="admin-modal-content animate-scale-in"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="admin-modal-header">
                                <div>
                                    <h3>Lead Intelligence Profile</h3>
                                    <p style={{ color: 'var(--admin-accent)', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem' }}>
                                        {editForm.name || 'Anonymous Prospect'} • {editForm.url || 'No URL'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="admin-btn-close"
                                    aria-label="Close modal"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="admin-modal-body">
                                <div className="admin-form-divider" data-label="Identity & Contact"></div>
                                <div className="admin-form-grid">
                                    <div className="admin-form-group">
                                        <label htmlFor="user-name" className="admin-label">Full Name</label>
                                        <div className="input-with-icon">
                                            <User size={18} />
                                            <input
                                                id="user-name"
                                                type="text"
                                                className="admin-input"
                                                value={editForm.name || ''}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                placeholder="e.g. John Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="company-url" className="admin-label">Company URL</label>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <div className="input-with-icon" style={{ flex: 1 }}>
                                                <Globe size={18} />
                                                <input
                                                    id="company-url"
                                                    type="text"
                                                    className="admin-input"
                                                    value={editForm.url || ''}
                                                    onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                                                    placeholder="example.com"
                                                />
                                            </div>
                                            <button
                                                onClick={handleScan}
                                                disabled={isScanning || !editForm.url}
                                                className="admin-btn-secondary"
                                                style={{ height: '52px', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Scan website to auto-fill fields"
                                                aria-label="Scan website"
                                            >
                                                {isScanning ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-form-divider" data-label="Firmographic Intelligence"></div>
                                <div className="admin-form-grid">
                                    <div className="admin-form-group">
                                        <label htmlFor="industry" className="admin-label">Primary Industry</label>
                                        <input
                                            id="industry"
                                            type="text"
                                            className="admin-input"
                                            value={editForm.industry || ''}
                                            onChange={e => setEditForm({ ...editForm, industry: e.target.value })}
                                            placeholder="e.g. Technology"
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="user-role" className="admin-label">Stakeholder Role</label>
                                        <input
                                            id="user-role"
                                            type="text"
                                            className="admin-input"
                                            value={editForm.role || ''}
                                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                            placeholder="e.g. CTO / Decision Maker"
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="company-size" className="admin-label">Operational Scale</label>
                                        <select
                                            id="company-size"
                                            className="admin-select"
                                            value={editForm.size || ''}
                                            onChange={e => setEditForm({ ...editForm, size: e.target.value })}
                                        >
                                            <option value="">Select Scale</option>
                                            <option value="1-10">Startup (1-10)</option>
                                            <option value="11-50">Emerging (11-50)</option>
                                            <option value="51-200">Scale-up (51-200)</option>
                                            <option value="201-500">Mid-Market (201-500)</option>
                                            <option value="501-1000">Enterprise (501-1000)</option>
                                            <option value="1000+">Global (1000+)</option>
                                        </select>
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="naics-code" className="admin-label">NAICS Classification</label>
                                        <input
                                            id="naics-code"
                                            type="text"
                                            className="admin-input"
                                            value={editForm.naicsCode || ''}
                                            onChange={e => setEditForm({ ...editForm, naicsCode: e.target.value })}
                                            placeholder="e.g. 541511"
                                        />
                                    </div>
                                </div>

                                <div className="admin-form-divider" data-label="Strategic Context"></div>
                                <div className="admin-form-grid">
                                    <div className="admin-form-group">
                                        <label htmlFor="scanner-source" className="admin-label">Intelligence Source</label>
                                        <select
                                            id="scanner-source"
                                            className="admin-select"
                                            value={editForm.scannerSource || 'System'}
                                            onChange={e => setEditForm({ ...editForm, scannerSource: e.target.value })}
                                        >
                                            <option value="System">System / Manual</option>
                                            <option value="AI">AI Scanner (GPT-4o Optimized)</option>
                                        </select>
                                    </div>
                                    <div className="admin-form-group">
                                        <label htmlFor="tech-stack" className="admin-label">Tech Stack Inventory</label>
                                        <input
                                            id="tech-stack"
                                            type="text"
                                            className="admin-input"
                                            value={Array.isArray(editForm.stack) ? editForm.stack.join(', ') : (editForm.stack || '')}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditForm({ ...editForm, stack: val.split(',').map(s => s.trim()) });
                                            }}
                                            placeholder="e.g. AWS, React, Postgres..."
                                        />
                                    </div>
                                </div>

                                <div className="admin-form-group">
                                    <label htmlFor="pain-point" className="admin-label">Primary Friction Point (Pain Point)</label>
                                    <textarea
                                        id="pain-point"
                                        className="admin-textarea"
                                        value={editForm.painPoint || ''}
                                        onChange={e => setEditForm({ ...editForm, painPoint: e.target.value })}
                                        placeholder="Detailed description of the business challenge..."
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label htmlFor="description" className="admin-label">Corporate Mission / Description</label>
                                    <textarea
                                        id="description"
                                        className="admin-textarea"
                                        value={editForm.description || ''}
                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                        placeholder="Summary of company activities and goals..."
                                    />
                                </div>
                            </div>

                            <div className="admin-modal-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.25rem', width: '100%' }}>
                                    <button type="button" onClick={() => setEditingUser(null)} className="admin-btn-secondary">Discard Changes</button>
                                    <button
                                        onClick={saveEditUser}
                                        className="admin-btn-primary"
                                    >
                                        <ShieldCheck size={18} style={{ marginRight: '0.5rem' }} /> Commit Profiles Updates
                                    </button>
                                </div>

                                <div style={{
                                    borderTop: '1px solid #f1f5f9',
                                    paddingTop: '1rem',
                                    textAlign: 'center',
                                    fontSize: '0.75rem',
                                    color: '#94a3b8',
                                    lineHeight: '1.4'
                                }}>
                                    <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                                        Authorized Use Only
                                    </p>
                                    <p>
                                        This system processes proprietary strategy data. All activities are logged for compliance and security monitoring.
                                    </p>
                                </div>
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
                    <div className="admin-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                        <div className="admin-page-header">
                            <div>
                                <h3 className="admin-page-title">
                                    <Users size={24} className="text-accent" /> Registered Users <span className="status-badge" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>{users.length}</span>
                                </h3>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={fetchUsers} className="btn-secondary" title="Refresh List">
                                    <RefreshCw size={16} />
                                </button>
                                <button onClick={() => openEditUserModal()} className="btn-primary">
                                    <Plus size={18} /> Add User
                                </button>
                            </div>
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

                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 500 }}>{u.name || '-'}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                                            <td>
                                                <span className={`status-badge ${u.role === 'admin' ? 'warning' : 'neutral'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${u.isActive ? 'success' : 'error'}`}>
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button onClick={() => openEditUserModal(u)} className="btn-ghost" title="Edit User">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleResetPassword(u.id)} className="btn-ghost" title="Reset Password">
                                                        <Key size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteUserReal(u.id)} className="btn-ghost user-delete-btn" title="Delete User" style={{ color: 'salmon' }}>
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Edit/Create User Modal */}
            {
                isEditingRealUser && (
                    <div className="admin-modal-overlay" onClick={() => setIsEditingRealUser(false)}>
                        <div
                            className="admin-modal-content animate-scale-in"
                            style={{ maxWidth: '600px' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="admin-modal-header">
                                <h3>{currentRealUser ? 'Edit User Record' : 'Create New User'}</h3>
                                <button
                                    onClick={() => setIsEditingRealUser(false)}
                                    className="admin-btn-close"
                                    aria-label="Close modal"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveUser}>
                                <div className="admin-modal-body">
                                    <div className="admin-form-group">
                                        <label htmlFor="user-email" className="admin-label">Email Address</label>
                                        <input
                                            id="user-email"
                                            type="email"
                                            className="admin-input"
                                            required
                                            value={userEditForm.email}
                                            onChange={e => setUserEditForm({ ...userEditForm, email: e.target.value })}
                                            placeholder="user@example.com"
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="user-display-name" className="admin-label">Full Name</label>
                                        <input
                                            id="user-display-name"
                                            type="text"
                                            className="admin-input"
                                            value={userEditForm.name}
                                            onChange={e => setUserEditForm({ ...userEditForm, name: e.target.value })}
                                            placeholder="Enter user's full name"
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="user-role-select" className="admin-label">System Role</label>
                                        <select
                                            id="user-role-select"
                                            className="admin-select"
                                            value={userEditForm.role}
                                            onChange={e => setUserEditForm({ ...userEditForm, role: e.target.value })}
                                        >
                                            <option value="user">Standard User</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>

                                    <div className="admin-form-group">
                                        <label htmlFor="user-password" className="admin-label">
                                            {currentRealUser ? 'Update Password (leave blank to keep)' : 'Initial Password'}
                                        </label>
                                        <input
                                            id="user-password"
                                            type="password"
                                            className="admin-input"
                                            required={!currentRealUser}
                                            value={userEditForm.password}
                                            onChange={e => setUserEditForm({ ...userEditForm, password: e.target.value })}
                                            placeholder={currentRealUser ? "••••••••" : "Enter temporary password"}
                                        />
                                    </div>
                                </div>

                                <div className="admin-modal-footer">
                                    <button type="button" onClick={() => setIsEditingRealUser(false)} className="admin-btn-secondary">Cancel</button>
                                    <button type="submit" className="admin-btn-primary" style={{ padding: '0.875rem 2.5rem' }}>
                                        {currentRealUser ? 'Apply Changes' : 'Generate User'}
                                    </button>
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
        </div>
    );
};

function IntegrationModal({ integration, onClose, onSave }: IntegrationModalProps) {
    const [name, setName] = useState(integration?.name || '');
    const [authType, setAuthType] = useState(integration?.authType || 'api_key');
    const [baseUrl, setBaseUrl] = useState(integration?.baseUrl || '');
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState(integration?.enabled ?? true);
    const [priority, setPriority] = useState(integration?.priority || 0);

    // Metadata fields
    const metadata = (integration?.metadata as any) || {};
    const effectiveProvider = metadata.provider || (integration?.name?.toLowerCase().includes('gemini') || integration?.name?.toLowerCase().includes('google') ? 'google' : 'openai');
    const [provider, setProvider] = useState<string>(effectiveProvider);
    const [model, setModel] = useState<string>(metadata.model || '');
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    const [isTesting, setIsTesting] = useState(false);

    const handleFetchModels = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/integrations/fetch-models', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    id: integration?.id,
                    apiKey,
                    provider
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.models && data.models.length > 0) {
                    setAvailableModels(data.models);
                    if (!model) setModel(data.models[0]);
                    alert(`Found ${data.models.length} models.`);
                } else {
                    alert("No models found. Check API Key or permissions.");
                }
            } else {
                const text = await res.text();
                alert(`Failed to fetch models: ${text}`);
            }
        } catch (error) {
            alert(`Error fetching models: ${error}`);
        }
    };

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
        setIsTesting(true);
        try {
            const res = await fetch('/api/admin/integrations/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: integration?.id,
                    authType,
                    baseUrl,
                    apiKey,
                    provider,
                    name,
                    model
                })
            });
            if (res.ok) {
                alert('Connection successful!');
            } else {
                alert(`Connection failed: ${await res.text()}`);
            }
        } catch (error) {
            alert(`Error testing connection: ${error}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div
                className="admin-modal-content animate-scale-in"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '600px' }}
            >
                <div className="admin-modal-header">
                    <div>
                        <h3>{integration ? 'Edit Integration' : 'Connect New Tool'}</h3>
                        <p style={{ color: 'var(--admin-accent)', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem' }}>
                            {name || 'Configure connection parameters'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="admin-btn-close"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div className="admin-modal-body">
                        <div className="admin-form-divider" data-label="Base Configuration"></div>
                        <div className="admin-form-group">
                            <label htmlFor="int-name" className="admin-label">Integration Name</label>
                            <input
                                id="int-name"
                                type="text"
                                className="admin-input"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. OpenAI Primary, Slack Webhook..."
                            />
                        </div>

                        <div className="admin-form-grid">
                            <div className="admin-form-group">
                                <label htmlFor="int-auth" className="admin-label">Auth Method</label>
                                <select
                                    id="int-auth"
                                    className="admin-select"
                                    value={authType}
                                    onChange={e => setAuthType(e.target.value as any)}
                                >
                                    <option value="api_key">API Key (Bearer)</option>
                                    <option value="oauth">OAuth / Token</option>
                                    <option value="basic">Basic Auth</option>
                                </select>
                            </div>

                            <div className="admin-form-group">
                                <label htmlFor="int-priority" className="admin-label">Routing Priority</label>
                                <select
                                    id="int-priority"
                                    className="admin-select"
                                    value={priority}
                                    onChange={e => setPriority(Number(e.target.value))}
                                >
                                    <option value={0}>Disabled / Manual Only</option>
                                    <option value={1}>Primary (High)</option>
                                    <option value={2}>Secondary (Medium)</option>
                                    <option value={3}>Log / Archive (Low)</option>
                                </select>
                            </div>
                        </div>

                        <div className="admin-form-group">
                            <label htmlFor="int-url" className="admin-label">Service URL / Endpoint</label>
                            <input
                                id="int-url"
                                type="text"
                                className="admin-input"
                                value={baseUrl}
                                onChange={e => setBaseUrl(e.target.value)}
                                placeholder="https://api.example.com/v1"
                            />
                        </div>

                        <div className="admin-form-group">
                            <label htmlFor="int-key" className="admin-label">Secret API Key {integration && '(Optional to update)'}</label>
                            <div className="input-with-icon">
                                <Key size={18} />
                                <input
                                    id="int-key"
                                    type="password"
                                    className="admin-input"
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder={integration ? "••••••••••••••••" : "Paste your secure key here"}
                                />
                            </div>
                        </div>


                        <div className="admin-form-divider" data-label="Model Parameters"></div>
                        <div className="admin-form-grid">
                            <div className="admin-form-group">
                                <label htmlFor="model-provider" className="admin-label">Provider</label>
                                <select
                                    id="model-provider"
                                    className="admin-select"
                                    value={provider}
                                    onChange={e => setProvider(e.target.value)}
                                >
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="google">Google Gemini</option>
                                    <option value="azure">Azure Cognitive</option>
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label htmlFor="model-name" className="admin-label">
                                    Model Identifier
                                    {availableModels.length > 0 && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'hsl(140, 70%, 40%)' }}>({availableModels.length} fetched)</span>}
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {availableModels.length > 0 ? (
                                        <select
                                            className="admin-select"
                                            value={availableModels.includes(model) ? model : 'custom'}
                                            onChange={e => {
                                                if (e.target.value === 'custom') setModel('');
                                                else setModel(e.target.value);
                                            }}
                                        >
                                            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                            <option value="custom">Manual Entry...</option>
                                        </select>
                                    ) : (
                                        <input
                                            id="model-name"
                                            type="text"
                                            className="admin-input"
                                            value={model}
                                            onChange={e => setModel(e.target.value)}
                                            placeholder="e.g. gemini-pro, gpt-4o"
                                        />
                                    )}
                                    <button
                                        onClick={handleFetchModels}
                                        className="admin-btn-secondary"
                                        title="Fetch Available Models"
                                        style={{ padding: '0 0.8rem' }}
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                                {availableModels.length > 0 && !availableModels.includes(model) && (
                                    <input
                                        type="text"
                                        className="admin-input"
                                        value={model}
                                        onChange={e => setModel(e.target.value)}
                                        placeholder="Enter custom model ID"
                                        style={{ marginTop: '0.5rem' }}
                                    />
                                )}
                            </div>
                        </div>


                        <div className="admin-form-group" style={{ marginTop: '1rem' }}>
                            <label className="checkbox-container admin-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={status}
                                    onChange={e => setStatus(e.target.checked)}
                                />
                                Enabled & Ready for Traffic
                            </label>
                        </div>
                    </div>

                    <div className="admin-modal-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.25rem', width: '100%' }}>
                            {integration && (
                                <button
                                    type="button"
                                    className="admin-btn-secondary"
                                    onClick={() => handleTest()}
                                    disabled={isTesting}
                                    style={{ padding: '0.875rem 1.5rem' }}
                                >
                                    {isTesting ? <RefreshCw size={18} className="spin" /> : <ShieldCheck size={18} style={{ marginRight: '0.5rem' }} />}
                                    Test Connection
                                </button>
                            )}
                            <div style={{ flex: 1 }} />
                            <button type="button" onClick={onClose} className="admin-btn-secondary">Cancel</button>
                            <button type="submit" className="admin-btn-primary" style={{ padding: '0.875rem 2rem' }}>
                                <Zap size={18} style={{ marginRight: '0.5rem' }} /> {integration ? 'Update Tool' : 'Register Tool'}
                            </button>
                        </div>

                        <div style={{
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: '1rem',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            lineHeight: '1.4'
                        }}>
                            <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                                Authorized Use Only
                            </p>
                            <p>
                                This system processes proprietary strategy data. All activities are logged for compliance and security monitoring.
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
