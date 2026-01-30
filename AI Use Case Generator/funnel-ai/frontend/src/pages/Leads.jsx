import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Filter,
    MoreHorizontal,
    Plus,
    Download,
    Search,
    Linkedin,
    Globe,
    Mail,
    Loader2,
    Upload,
    FileText,
    CheckCircle,
    AlertCircle,
    Send,
    MessageSquare,
    Calendar,
    FileEdit,
    CheckSquare,
    Eye,
    MoveRight,
    Phone,
    ChevronDown,
    ChevronRight,
    TrendingUp,
    DollarSign,
    CalendarCheck,
    Clock,
    Smile,
    Shield,
    Zap,
    BarChart,
    Frown,
    Meh,
    Sparkles,
    X,
    MoreVertical, Trash2, Edit, RotateCcw, AlertTriangle, Layers, HelpCircle, Lock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { fetchLeads, createLead, updateLead, disqualifyLead, recalculateLeads } from '../lib/api';
import { createDeal } from '../lib/api_pipeline';
import { fetchUser } from '../lib/api_user';
import { actionApi } from '../lib/api_actions';
import { authenticatedFetch } from '../lib/api_client';
import OutreachModal from '../components/OutreachModal';
import CRMActionModal from '../components/CRMActionModal';
import LeadDetailsModal from '../components/LeadDetailsModal';
import LeadSourceModal from '../components/LeadSourceModal';
import LeadFormModal from '../components/LeadFormModal';
import ActivityTimeline from '../components/ActivityTimeline';
import NotesList from '../components/NotesList';
import Toast from '../components/Toast';
import DisqualifyModal from '../components/DisqualifyModal';
import DeduplicationModal from '../components/DeduplicationModal';
import EnrichmentModal from '../components/EnrichmentModal';
import FilterBar from '../components/FilterBar';
import { AnimatePresence, motion } from 'framer-motion';

// ... (keep existing imports and components)




const SCORE_COLOR = (score) => {
    if (score >= 90) return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (score >= 70) return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    if (score >= 50) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
};

export default function Leads() {
    const [searchParams] = useSearchParams();
    const [leads, setLeads] = useState([]);
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [openActionMenu, setOpenActionMenu] = useState(null);
    const [businessType, setBusinessType] = useState('b2b'); // Default to B2B
    const [user, setUser] = useState(null);


    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [outreachConfig, setOutreachConfig] = useState(null); // { isOpen: false, lead: null, type: 'email' }
    const [crmActionConfig, setCrmActionConfig] = useState(null);
    const [detailsConfig, setDetailsConfig] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        source: '',
        min_score: ''
    });

    const [expandedLeadId, setExpandedLeadId] = useState(null);
    const [disqualifyModalOpen, setDisqualifyModalOpen] = useState(false);
    const [leadToDisqualify, setLeadToDisqualify] = useState(null);
    const [requalifyModalOpen, setRequalifyModalOpen] = useState(false);
    const [isDedupModalOpen, setIsDedupModalOpen] = useState(false);
    const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false);
    const [duplicateLeadInfo, setDuplicateLeadInfo] = useState(null); // { message: string, lead: object }
    const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' }
    const [pipelineConfirm, setPipelineConfirm] = useState({ isOpen: false, lead: null });
    const toggleRow = (id) => setExpandedLeadId(expandedLeadId === id ? null : id);

    const handleMenuClick = (e, leadId) => {
        e.stopPropagation();
        if (openActionMenu === leadId) {
            setOpenActionMenu(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = rect.right - 224;
            const y = rect.bottom + 8;
            setMenuPosition({ top: y, left: x });
            setOpenActionMenu(leadId);
        }
    };

    const handleActionClick = (action) => {
        const lead = leads.find(l => l.id === openActionMenu);
        if (lead) {
            handleAction(action, lead);
        }
    };

    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    const loadLeadsList = async () => {
        try {
            const [leadsData, userData] = await Promise.all([
                fetchLeads({ ...filters, sort_by: sortBy, sort_order: sortOrder }),
                fetchUser()
            ]);
            setLeads(leadsData);
            if (userData?.business_type) {
                setBusinessType(userData.business_type);
            }
            setUser(userData);
        } catch (err) {
            console.error("Failed to load leads", err);
            setError("Failed to load leads. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    // Feature Gating Logic
    const [planAccess, setPlanAccess] = useState({ lead_discovery: true }); // Default true until fetched
    const [currentPlanDetails, setCurrentPlanDetails] = useState(null);
    useEffect(() => {
        const checkPlan = async () => {
            try {
                // Fetch real user data to get the plan
                const res = await authenticatedFetch('/api/users/me');
                if (res.ok) {
                    const user = await res.json();

                    // Fallback for user plan tier if undefined
                    let userTier = (user.plan_tier || 'free').toLowerCase().trim();
                    // Map 'free' to 'starter' as per business logic
                    if (userTier === 'free') userTier = 'starter';

                    // Fetch all available plans to get feature flags
                    const plansRes = await authenticatedFetch('/api/plans/');
                    if (plansRes.ok) {
                        const data = await plansRes.json();
                        // Match user plan to system plans (case-insensitive)
                        const currentPlan = data.find(p => p.name.toLowerCase().trim() === userTier);

                        if (currentPlan && currentPlan.features) {
                            setPlanAccess(currentPlan.features);
                            setCurrentPlanDetails(currentPlan);
                        } else {
                            // Default fallback if plan not found
                            setPlanAccess({});
                            setCurrentPlanDetails(null);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to check plan features", e);
            }
        };
        checkPlan();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadLeadsList();
        }, 300);
        return () => clearTimeout(timer);
    }, [sortBy, sortOrder, filters]);

    // Check for open_lead param
    useEffect(() => {
        const leadId = searchParams.get('open_lead');
        if (leadId && leads.length > 0) {
            const leadToOpen = leads.find(l => l.id === parseInt(leadId));
            if (leadToOpen) {
                setDetailsConfig({ isOpen: true, lead: leadToOpen });
                // Optional: Clear param so refresh doesn't reopen, or keep it for deep linking support
                // setSearchParams({}); 
            }
        }
    }, [searchParams, leads]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openActionMenu && !e.target.closest('button')) {
                setOpenActionMenu(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openActionMenu]);

    const handleAction = async (action, lead) => {
        setOpenActionMenu(null); // Close menu
        try {
            let result;
            let input;

            switch (action) {
                // Outreach
                case 'email':
                case 'sms':
                case 'linkedin':
                    // Open AI Draft Modal
                    setOutreachConfig({
                        isOpen: true,
                        lead: lead,
                        type: action // 'email', 'sms', or 'linkedin'
                    });
                    return; // Return early, handled by modal

                // CRM
                case 'pipeline':
                case 'followup':
                case 'note':
                    setCrmActionConfig({ isOpen: true, lead: lead, type: action });
                    break;

                case 'details':
                    setDetailsConfig({ isOpen: true, lead: lead });
                    break;

                case 'contacted':
                    result = await actionApi.markContacted(lead.id);
                    break;

                default:
                    console.warn('Unknown action:', action);
            }


            // Success feedback
            if (result && result.status === 'success') {
                console.log("Action success:", result.message);
                loadLeadsList();
                setToast({ message: "Action recorded successfully", type: 'success' });
            }

        } catch (err) {
            console.error("Action failed:", err);
            setToast({ message: "Action failed: " + err.message, type: 'error' });
        }
    };

    const [leadToEdit, setLeadToEdit] = useState(null);

    const handleLeadFormSubmit = async (formData) => {
        setSubmitting(true);
        try {
            if (leadToEdit) {
                await updateLead(leadToEdit.id, formData);
            } else {
                await createLead(formData);
            }
            setIsModalOpen(false);
            setLeadToEdit(null);
            loadLeadsList();
        } catch (err) {
            if (err.message && err.message.includes("Lead previously disqualified")) {
                setDuplicateLeadInfo({
                    message: err.message,
                    formData: formData
                });
                setRequalifyModalOpen(true);
                setIsModalOpen(false); // Close add form
            } else {
                setToast({ message: "Failed to save lead: " + err.message, type: 'error' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditLead = (lead) => {
        setLeadToEdit(lead);
        setIsModalOpen(true);
    };

    const toggleSelect = (id) => {
        if (selectedLeads.includes(id)) {
            setSelectedLeads(selectedLeads.filter(l => l !== id));
        } else {
            setSelectedLeads([...selectedLeads, id]);
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedLeads(leads.map(l => l.id));
        } else {
            setSelectedLeads([]);
        }
    };

    const handlePushToPipeline = (lead) => {
        setPipelineConfirm({ isOpen: true, lead: lead });
    };

    const performPushToPipeline = async () => {
        const lead = pipelineConfirm.lead;
        if (!lead || submitting) return;

        setSubmitting(true);
        try {
            await createDeal({
                title: lead.company || `${lead.first_name} ${lead.last_name}` || 'New Deal',
                value: 0,
                stage_id: 6, // "Cold" Stage ID
                lead_id: lead.id
            });

            await updateLead(lead.id, { status: 'won', lifecycle_stage: 'customer' });

            setToast({ message: "Deal created! Moved to Pipeline.", type: 'success' });
            setPipelineConfirm({ isOpen: false, lead: null });
            loadLeadsList(); // Refresh
        } catch (err) {
            setToast({ message: "Failed to push to pipeline: " + err.message, type: 'error' });
            setPipelineConfirm({ isOpen: false, lead: null });
        } finally {
            setSubmitting(false);
        }
    };

    const downloadSampleCSV = () => {
        const sampleData = [
            ['first_name', 'last_name', 'email', 'phone', 'company', 'title', 'location', 'linkedin_url', 'secondary_email', 'secondary_phone', 'revenue_last_year'],
            ['Jane', 'Smith', 'jane.smith@example.com', '+1 (555) 123-4567', 'Acme Corp', 'VP Marketing', 'San Francisco, CA', 'linkedin.com/in/janesmith', 'jane@personal.com', '555-999-0000', '1000000'],
            ['John', 'Doe', 'john.doe@techco.com', '+1 (555) 987-6543', 'TechCo', 'CEO', 'New York, NY', '', '', '', '500000'],
            ['Alice', 'Johnson', 'alice@startup.io', '', 'Startup Inc', 'Director of Sales', 'Austin, TX', '', 'alice.alt@gmail.com', '', '']
        ];

        const csvContent = sampleData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leads_import_template.csv';
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
    };

    const handleImportCSV = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            alert("Please select a CSV file");
            return;
        }

        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await authenticatedFetch('/api/leads/import', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Import failed');
            }

            const result = await response.json();
            setImportResult(result);

            if (result.imported > 0) {
                loadLeadsList();
            }
        } catch (err) {
            setImportResult({
                status: 'error',
                message: err.message,
                imported: 0,
                errors: [err.message]
            });
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Lead Discovery</h2>
                    <p className="text-gray-400 mt-1">Manage and score your potential prospects.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-all"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Import
                    </button>
                    <div className="relative group">
                        <button
                            disabled={!planAccess.ai_enrichment}
                            onClick={() => setIsSourceModalOpen(true)}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm transition-all border ${planAccess.ai_enrichment
                                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                                : 'bg-gray-800/50 border-white/5 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {planAccess.ai_enrichment ? (
                                <Globe className="w-4 h-4 mr-2" />
                            ) : (
                                <Lock className="w-4 h-4 mr-2" />
                            )}
                            Get Leads
                        </button>
                        {!planAccess.ai_enrichment && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-black border border-white/10 rounded-lg text-xs text-center text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Upgrade plan to unlock Get Leads
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setLeadToEdit(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Raw Lead
                    </button>
                    {/* Sort Dropdown */}
                    <div className="relative inline-block text-left ml-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg text-sm text-white py-2 pl-3 pr-8 focus:outline-none focus:bg-white/10"
                        >
                            <option value="created_at">Newest</option>
                            <option value="score">Signal Score</option>
                            <option value="company">Company</option>
                            <option value="last_contacted_at">Last Contacted</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="ml-2 p-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10"
                            title={sortOrder === 'asc' ? "Ascending" : "Descending"}
                        >
                            {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <LeadFormModal
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setLeadToEdit(null);
                        }}
                        onSubmit={handleLeadFormSubmit}
                        initialData={leadToEdit}
                        businessType={businessType}
                    />
                )}
            </AnimatePresence>

            {/* Source Modal */}
            <AnimatePresence>
                {isSourceModalOpen && (
                    <LeadSourceModal
                        isOpen={isSourceModalOpen}
                        onClose={() => setIsSourceModalOpen(false)}
                        onLeadsImported={(count) => {
                            loadLeadsList(); // Refresh list
                            // Ideally show a toast here
                        }}
                        weeklyLimit={currentPlanDetails?.weekly_limit}
                        weeklyUsage={user?.usage_leads_weekly || 0}
                    />
                )}
            </AnimatePresence>

            {/* Import Modal */}
            <AnimatePresence>
                {isImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 border border-white/10 rounded-xl max-w-lg w-full p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Import Leads (CSV)</h3>
                                <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleImportCSV} className="space-y-6">
                                {/* Help Section */}
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300">
                                    <div className="flex items-center gap-2 font-bold mb-2">
                                        <HelpCircle className="w-4 h-4" /> CSV Format Guide
                                    </div>
                                    <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                                        <li>Required: <strong>first_name</strong> (or company)</li>
                                        <li>Recommended: last_name, email, phone, title, company, location</li>
                                        <li>Extra: linkedin_url, revenue_last_year</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-400">Step 1: Download Template</label>
                                    <button
                                        type="button"
                                        onClick={downloadSampleCSV}
                                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                                    >
                                        <Download className="w-4 h-4" /> Download Example Template
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-400">Step 2: Upload File</label>
                                    <div className="relative border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="pointer-events-none">
                                            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                            {selectedFile ? (
                                                <p className="text-blue-400 font-medium">{selectedFile.name}</p>
                                            ) : (
                                                <p className="text-gray-500 text-sm">Click or drag CSV file here</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {importResult && (
                                    <div className={`p-4 rounded-lg text-sm ${importResult.status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        <p className="font-bold mb-1">{importResult.status === 'success' ? 'Import Successful' : 'Import Failed'}</p>
                                        {importResult.status === 'success' ? (
                                            <p>{importResult.imported} leads imported successfully.</p>
                                        ) : (
                                            <p>{importResult.message}</p>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setIsImportModalOpen(false)}
                                        className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={importing || !selectedFile}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium flex items-center gap-2"
                                    >
                                        {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Start Import
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            {/* Global Actions Bar */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20 text-sm font-medium"
                    onClick={() => setIsDedupModalOpen(true)}
                >
                    <Layers className="w-4 h-4" />
                    De-duplication
                </button>


                <div className="relative group">
                    <button
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border text-sm font-medium ${planAccess.enrich_all
                            ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20'
                            : 'bg-gray-800/50 text-gray-500 border-white/5 cursor-not-allowed'
                            }`}
                        onClick={() => planAccess.enrich_all && setIsEnrichmentModalOpen(true)}
                    >
                        {planAccess.enrich_all ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        Enrich All
                    </button>
                    {!planAccess.enrich_all && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-black border border-white/10 rounded-lg text-xs text-center text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Upgrade to Pro for Bulk Enrichment
                        </div>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-visible">
                {/* Filter Bar */}
                <FilterBar filters={filters} onFilterChange={setFilters} />

                {
                    loading ? (
                        <div className="p-8 flex justify-center items-center text-gray-400" >
                            <Loader2 className="animate-spin w-8 h-8" />
                        </div>
                    ) : error ? (
                        <div className="p-8 flex justify-center items-center text-red-400">
                            {error}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto overflow-y-visible">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 border-b border-white/10">
                                        <tr>
                                            <th className="p-4 w-8"></th>
                                            <th className="p-4 w-12">
                                                <input
                                                    type="checkbox"
                                                    onChange={toggleSelectAll}
                                                    checked={selectedLeads.length === leads.length && leads.length > 0}
                                                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-offset-gray-900"
                                                />
                                            </th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Prospect</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Company</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-32">Source</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-32">Signal Score</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider text-right w-40">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {leads.map((lead) => {
                                            return (
                                                <React.Fragment key={lead.id}>
                                                    <tr className="hover:bg-white/5 transition-colors group">
                                                        <td className="p-4 text-gray-500">
                                                            {/* Removed expander */}
                                                        </td>
                                                        <td className="p-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedLeads.includes(lead.id)}
                                                                onChange={() => toggleSelect(lead.id)}
                                                                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-offset-gray-900"
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white">
                                                                    {lead.first_name?.[0]}{lead.last_name?.[0]}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-white">{lead.first_name} {lead.last_name}</div>
                                                                    <div className="text-xs text-gray-400">{lead.title || 'Unknown Title'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="text-gray-200 font-medium">{lead.company || 'Unknown'}</div>
                                                            <div className="text-xs text-blue-400">{lead.location}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            {/* Source Column */}
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300 capitalize border border-white/5">
                                                                {lead.source || 'Manual'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", SCORE_COLOR(lead.score))}>
                                                                <TrendingUp className="w-3 h-3 mr-1" />
                                                                {lead.score} / 100
                                                            </div>
                                                        </td>

                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-2 items-center">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handlePushToPipeline(lead); }}
                                                                    className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded text-xs font-medium flex items-center gap-2 transition-colors"
                                                                    title="Push to Pipeline"
                                                                >
                                                                    Push to Pipeline
                                                                </button>

                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleEditLead(lead); }}
                                                                    className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                                                    title="Edit Lead"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setLeadToDisqualify(lead);
                                                                        setDisqualifyModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 hover:bg-red-500/10 rounded text-red-400/70 hover:text-red-400 transition-colors"
                                                                    title="Disqualify Lead"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination... */}
                            {/* ... */}
                        </>
                    )}




            </div>

            {/* Disqualify Modal */}
            <DisqualifyModal
                isOpen={disqualifyModalOpen}
                onClose={() => {
                    setDisqualifyModalOpen(false);
                    setLeadToDisqualify(null);
                }}
                onConfirm={async (reason) => {
                    try {
                        await disqualifyLead(leadToDisqualify.id, reason);
                        setDisqualifyModalOpen(false);
                        setLeadToDisqualify(null);
                        loadLeadsList(); // Refresh
                        setToast({ message: "Lead disqualified.", type: 'success' });
                    } catch (err) {
                        setToast({ message: "Failed to disqualify: " + err.message, type: 'error' });
                    }
                }}
                leadName={leadToDisqualify ? `${leadToDisqualify.first_name} ${leadToDisqualify.last_name}` : ''}
            />

            {/* Re-qualify Warning Modal */}
            <AnimatePresence>
                {requalifyModalOpen && duplicateLeadInfo && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 border border-yellow-500/30 rounded-xl max-w-md w-full p-6 shadow-2xl"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-full bg-yellow-500/10">
                                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Simulated Conflict</h3>
                                    <p className="text-gray-300 text-sm mb-4">
                                        {duplicateLeadInfo.message || "This lead was previously disqualified."}
                                    </p>
                                    <div className="text-sm bg-black/40 p-3 rounded-lg border border-white/5 mb-4 text-gray-400">
                                        <p>Would you like to restore this lead and reset its status to New?</p>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setRequalifyModalOpen(false)}
                                            className="px-4 py-2 hover:bg-white/10 text-gray-400 rounded-lg text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await createLead(duplicateLeadInfo.formData, true);
                                                    setRequalifyModalOpen(false);
                                                    setDuplicateLeadInfo(null);
                                                    loadLeadsList(); // Refresh
                                                    // Optional: toast success
                                                } catch (e) {
                                                    alert("Failed to restore: " + e.message);
                                                }
                                            }}
                                            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 border border-yellow-500/30 rounded-lg text-sm font-medium"
                                        >
                                            Restore Lead
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Deduplication Modal */}
            <AnimatePresence>
                {isDedupModalOpen && (
                    <DeduplicationModal
                        isOpen={isDedupModalOpen}
                        onClose={() => setIsDedupModalOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Enrichment Modal */}
            <AnimatePresence>
                {isEnrichmentModalOpen && (
                    <EnrichmentModal
                        isOpen={isEnrichmentModalOpen}
                        onClose={() => setIsEnrichmentModalOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {/* Pipeline Confirmation Modal */}
            <AnimatePresence>
                {pipelineConfirm.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-2">Create Deal?</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Are you sure you want to push <strong>{pipelineConfirm.lead?.company || pipelineConfirm.lead?.first_name}</strong> to the pipeline?
                                This will create a new deal in the "Cold" stage.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setPipelineConfirm({ isOpen: false, lead: null })}
                                    className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={submitting}
                                    onClick={performPushToPipeline}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Deal
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div >
    );
}
