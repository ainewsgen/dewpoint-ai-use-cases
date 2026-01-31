import React, { useState, useEffect } from 'react';
import {
    Activity,
    Database,
    Zap,
    Layers,
    ShieldCheck,
    CheckCircle2,
    ArrowRightLeft,
    Plus,
    Loader2,
    X,
    Mail,
    MessageSquare,
    Linkedin,
    Search,
    Cpu,
    BrainCircuit,
    Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';

const INTEGRATIONS_LIST = [
    {
        id: 'smtp',
        name: 'Email Provider (SMTP)',
        description: 'Connect your email server for direct outreach.',
        icon: <Mail className="w-8 h-8 text-blue-400" />,
        category: 'Communication',
        status: 'disconnected',
        isNative: true
    },
    {
        id: 'twilio',
        name: 'Twilio SMS',
        description: 'Send automated SMS/Text messages via Twilio.',
        icon: <MessageSquare className="w-8 h-8 text-green-400" />,
        category: 'Communication',
        status: 'disconnected',
        isNative: true
    },
    {
        id: 'linkedin',
        name: 'LinkedIn Sales Nav',
        description: 'Sync contacts and messages (requires API access).',
        icon: <Linkedin className="w-8 h-8 text-blue-600" />,
        category: 'Communication',
        status: 'disconnected',
        isNative: true
    },
    {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'Sync leads, contacts, and deal stages automatically.',
        icon: 'https://cdn.worldvectorlogo.com/logos/hubspot.svg',
        category: 'CRM',
        status: 'disconnected'
    },
    {
        id: 'salesforce',
        name: 'Salesforce',
        description: 'Advanced bidirectional sync for enterprise pipelines.',
        icon: 'https://cdn.worldvectorlogo.com/logos/salesforce-2.svg',
        category: 'CRM',
        status: 'disconnected'
    },
    {
        id: 'zoho',
        name: 'Zoho CRM',
        description: 'Comprehensive lead management and marketing sync.',
        icon: 'https://cdn.worldvectorlogo.com/logos/zoho-1.svg',
        category: 'CRM',
        status: 'disconnected'
    },
    {
        id: 'google_search',
        name: 'Google Search API',
        description: 'High-volume lead sourcing via Programmable Search Engine.',
        icon: <Search className="w-8 h-8 text-yellow-400" />,
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'upwork',
        name: 'Upwork',
        description: 'Find active service seekers and freelance opportunities.',
        icon: 'https://cdn.worldvectorlogo.com/logos/upwork.svg',
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'indeed',
        name: 'Indeed',
        description: 'Source hiring managers from active job postings.',
        icon: 'https://cdn.worldvectorlogo.com/logos/indeed-1.svg',
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'ziprecruiter',
        name: 'ZipRecruiter',
        description: 'Connect with companies actively hiring.',
        icon: 'https://cdn.worldvectorlogo.com/logos/ziprecruiter.svg',
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'monster',
        name: 'Monster',
        description: 'Global database of resumes and job postings.',
        icon: 'https://cdn.worldvectorlogo.com/logos/monster-6.svg',
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'yelp',
        name: 'Yelp',
        description: 'Source local businesses and service providers.',
        icon: 'https://cdn.worldvectorlogo.com/logos/yelp.svg',
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'fiverr',
        name: 'Fiverr',
        description: 'Connect with freelancers and agencies offering services.',
        icon: 'https://cdn.worldvectorlogo.com/logos/fiverr-1.svg',
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'houzz',
        name: 'Houzz',
        description: 'Home design, construction, and remodeling professionals.',
        icon: 'https://cdn.worldvectorlogo.com/logos/houzz-2.svg',
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'thumbtack',
        name: 'Thumbtack',
        description: 'Local professionals for home, events, and other services.',
        icon: 'https://cdn.worldvectorlogo.com/logos/thumbtack-2.svg',
        category: 'Lead Sourcing',
        status: 'disconnected'
    },
    {
        id: 'openai',
        name: 'OpenAI (GPT-4)',
        description: 'Power email analysis, drafting, and sentiment logic.',
        icon: <BrainCircuit className="w-8 h-8 text-emerald-400" />,
        category: 'AI & Intelligence',
        status: 'disconnected'
    },
    {
        id: 'apollo',
        name: 'Apollo.io',
        description: 'Enrich leads with high-fidelity contact data.',
        icon: <Database className="w-8 h-8 text-indigo-400" />,
        category: 'Data Enrichment',
        status: 'disconnected'
    }
];

export default function Integrations() {
    const [integrations, setIntegrations] = useState(INTEGRATIONS_LIST);
    const [features, setFeatures] = useState({}); // { crm_sync: true/false }
    const [loading, setLoading] = useState(true);
    const [connectModal, setConnectModal] = useState(null); // { isOpen: true, id: 'smtp' }
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null); // { message, type }

    // Credentials state
    const [creds, setCreds] = useState({
        api_key: '',
        api_secret: '',
        endpoint: ''
    });

    const loadIntegrations = async () => {
        try {
            // Fetch backend integrations
            const response = await fetch('/api/integrations/');
            const data = await response.json();

            // Fetch user plan for feature gating
            const planRes = await fetch('/api/users/me');
            if (planRes.ok) {
                const user = await planRes.json();
                let userTier = (user.plan_tier || 'free').toLowerCase().trim();
                if (userTier === 'free') userTier = 'starter';

                const allPlansRes = await fetch('/api/plans/');
                if (allPlansRes.ok) {
                    const allPlans = await allPlansRes.json();
                    const currentPlan = allPlans.find(p => p.name.toLowerCase().trim() === userTier);
                    if (currentPlan) {
                        setFeatures(currentPlan.features || {});
                    }
                }
            }

            // Merge backend status with local list
            const updatedList = INTEGRATIONS_LIST.map(item => {
                const backendItem = data.find(d => d.crm_type === item.id);
                return backendItem ? { ...item, status: backendItem.is_connected ? 'connected' : 'disconnected' } : item;
            });
            setIntegrations(updatedList);
        } catch (err) {
            console.error("Failed to load integrations", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIntegrations();
    }, []);

    const openConnect = (item) => {
        setCreds({ api_key: '', api_secret: '', endpoint: '' });
        setConnectModal({ isOpen: true, item });
    };

    const handleConnectSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const { item } = connectModal;

        try {
            const response = await fetch(`/api/integrations/${item.id}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });

            if (response.ok) {
                setIntegrations(prev => prev.map(i =>
                    i.id === item.id ? { ...i, status: 'connected' } : i
                ));
                setConnectModal(null);
                setToast({ message: `${item.name} connected successfully!`, type: 'success' });
            } else {
                setToast({ message: "Failed to connect. Please check credentials.", type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: "Network error occurred.", type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDisconnect = async (id) => {
        if (confirm(`Are you sure you want to disconnect ${id}?`)) {
            try {
                await fetch(`/api/integrations/${id}/disconnect`, { method: 'POST' });
                setIntegrations(prev => prev.map(item =>
                    item.id === id ? { ...item, status: 'disconnected' } : item
                ));
                setToast({ message: "Disconnected successfully.", type: 'success', autoClose: false });
            } catch (err) {
                setToast({ message: "Failed to disconnect.", type: 'error', autoClose: true });
            }
        }
    };

    const renderFormFields = (id) => {
        switch (id) {
            case 'smtp':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">SMTP Host</label>
                            <input required type="text" placeholder="smtp.gmail.com" className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.endpoint} onChange={e => setCreds({ ...creds, endpoint: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Username/Email</label>
                            <input required type="text" placeholder="user@example.com" className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Password/App Password</label>
                            <input required type="password" placeholder="••••••••" className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'twilio':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Account SID</label>
                            <input required type="text" placeholder="AC..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Auth Token</label>
                            <input required type="password" placeholder="••••••••" className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'linkedin':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">LinkedIn Cookie (li_at)</label>
                            <input required type="password" placeholder="AQED..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                            <p className="text-[10px] text-gray-500 mt-1">Required for unofficial API access. Use a devoted bot account.</p>
                        </div>
                    </>
                );
            case 'hubspot':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Private App Access Token</label>
                            <input required type="password" placeholder="pat-na1-..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                            <p className="text-[10px] text-gray-500 mt-1">Found in HubSpot Settings &gt; Integrations &gt; Private Apps</p>
                        </div>
                    </>
                );
            case 'salesforce':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Instance URL</label>
                            <input required type="text" placeholder="https://your-domain.my.salesforce.com" className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.endpoint} onChange={e => setCreds({ ...creds, endpoint: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Consumer Key</label>
                            <input required type="text" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Consumer Secret</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'zoho':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Domain</label>
                            <input required type="text" placeholder="zoho.com / zoho.eu" className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.endpoint} onChange={e => setCreds({ ...creds, endpoint: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Client ID</label>
                            <input required type="text" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Client Secret</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'google_search':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
                            <input required type="password" placeholder="AIza..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Search Engine ID (CX)</label>
                            <input required type="text" placeholder="0123..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'upwork':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Client ID</label>
                            <input required type="text" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Client Secret</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'indeed':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Publisher ID</label>
                            <input required type="text" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                    </>
                );
            case 'ziprecruiter':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                    </>
                );
            case 'monster':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Client ID</label>
                            <input required type="text" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Client Secret</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'yelp':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">API Key (Fusion)</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                    </>
                );
            case 'fiverr':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Client ID</label>
                            <input required type="text" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Client Secret</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'houzz':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Application ID</label>
                            <input required type="text" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Application Token</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_secret} onChange={e => setCreds({ ...creds, api_secret: e.target.value })} />
                        </div>
                    </>
                );
            case 'thumbtack':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">API Access Token</label>
                            <input required type="password" placeholder="..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                    </>
                );
            case 'openai':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
                            <input required type="password" placeholder="sk-..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                        </div>
                    </>
                );
            case 'apollo':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
                            <input required type="password" placeholder="api_..." className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={creds.api_key} onChange={e => setCreds({ ...creds, api_key: e.target.value })} />
                            <p className="text-[10px] text-gray-500 mt-1">Found in Apollo Settings &gt; Integrations &gt; API</p>
                        </div>
                    </>
                );
            default:
                return (
                    <p className="text-gray-400 text-sm">Click connect to enable this integration.</p>
                );
        }
    };

    const groupedIntegrations = {
        Communication: integrations.filter(i => i.category === 'Communication'),
        CRM: integrations.filter(i => i.category === 'CRM'),
        Sourcing: integrations.filter(i => i.category === 'Lead Sourcing'),
        AI: integrations.filter(i => i.category === 'AI & Intelligence'),
        Data: integrations.filter(i => i.category === 'Data Enrichment')
    };

    const IntegrationCard = ({ item, locked = false }) => (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "group relative border rounded-2xl p-6 transition-all duration-300 flex flex-col h-full",
                locked
                    ? "bg-white/5 border-white/5 opacity-70"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center p-2 text-white ${locked ? 'bg-gray-800 text-gray-500' :
                    item.category === 'Communication' ? 'bg-blue-500/20' :
                        item.category === 'Lead Sourcing' ? 'bg-yellow-500/20' :
                            item.category === 'AI & Intelligence' ? 'bg-emerald-500/20' :
                                'bg-orange-500/20'
                    }`}>
                    {typeof item.icon === 'string' ? <img src={item.icon} alt={item.name} className={`w-full h-full object-contain ${locked ? 'grayscale opacity-50' : ''}`} /> : item.icon}
                </div>
                {locked ? (
                    <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                    </span>
                ) : item.status === 'connected' ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                    </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-full bg-white/5 text-gray-400 text-xs font-medium border border-white/10 italic">
                        Disconnected
                    </span>
                )}
            </div>

            <h4 className="text-lg font-bold text-white mb-1 text-left">{item.name}</h4>
            <p className="text-sm text-gray-400 mb-6 text-left flex-grow">{item.description}</p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{item.category}</span>
                {locked ? (
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-500 text-xs font-bold cursor-not-allowed"
                    >
                        Upgrade Plan
                    </button>
                ) : item.status === 'connected' ? (
                    <button
                        onClick={() => handleDisconnect(item.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                    >
                        Disconnect
                    </button>
                ) : (
                    <button
                        onClick={() => openConnect(item)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all shadow-lg ${item.category === 'Communication' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20'}`}
                    >
                        Connect <Plus className="w-3 h-3" />
                    </button>
                )}
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-12 pb-12 relative">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight text-left">Integration Store</h2>
                <p className="text-gray-400 mt-1 text-left max-w-2xl">
                    Manage your stack. Connect communication channels for outreach and CRMs for data synchronization.
                </p>
            </div>

            {/* Communication Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-xl font-bold text-white">Communication Channels</h3>
                        <p className="text-sm text-gray-400">Power your AI outreach with direct Email, SMS, and Social connections.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedIntegrations.Communication.map((item) => (
                        <IntegrationCard key={item.id} item={item} />
                    ))}
                </div>
            </div>

            {/* AI & Lead Sourcing Section (New) */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Cpu className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-xl font-bold text-white">Intelligence & Sourcing</h3>
                        <p className="text-sm text-gray-400">Power the brain and data feed of your funnel.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Combine AI and Sourcing here */}
                    {groupedIntegrations.AI.map((item) => <IntegrationCard key={item.id} item={item} />)}
                    {groupedIntegrations.Sourcing.map((item) => <IntegrationCard key={item.id} item={item} />)}
                </div>
            </div>

            {/* CRM Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Database className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-xl font-bold text-white">CRM & Data Sync</h3>
                        <p className="text-sm text-gray-400">Bi-directional synchronization with your system of record.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedIntegrations.CRM.map((item) => (
                        <IntegrationCard
                            key={item.id}
                            item={item}
                            locked={!features.crm_sync}
                        />
                    ))}
                </div>
            </div>

            {/* Data Enrichment Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Database className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-xl font-bold text-white">Data Enrichment</h3>
                        <p className="text-sm text-gray-400">Enhance your lead data with third-party providers.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedIntegrations.Data.map((item) => (
                        <IntegrationCard key={item.id} item={item} />
                    ))}
                </div>
            </div>

            {/* Connect Modal */}
            <AnimatePresence>
                {connectModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setConnectModal(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Connect {connectModal.item.name}</h3>
                                <button onClick={() => setConnectModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleConnectSubmit} className="space-y-4">
                                {renderFormFields(connectModal.item.id)}

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setConnectModal(null)} className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/5">Cancel</button>
                                    <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium flex justify-center items-center gap-2">
                                        {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : "Save & Connect"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        autoClose={toast.autoClose}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
