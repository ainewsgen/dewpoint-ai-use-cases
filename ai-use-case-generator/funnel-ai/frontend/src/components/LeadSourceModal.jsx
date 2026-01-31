import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Globe, Linkedin, Loader2, CheckCircle, Plus } from 'lucide-react';

export default function LeadSourceModal({ isOpen, onClose, onLeadsImported, weeklyLimit, weeklyUsage = 0 }) {
    console.log("Rendering LeadSourceModal", { isOpen, weeklyLimit, weeklyUsage });

    const [keywords, setKeywords] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [location, setLocation] = useState('');
    const [platform, setPlatform] = useState('google');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [error, setError] = useState(null);
    const [hasGoogleApi, setHasGoogleApi] = useState(false);
    const [leadRunId, setLeadRunId] = useState(null);
    const [runStatus, setRunStatus] = useState(null);
    const [runStats, setRunStats] = useState(null);

    // Check Integration
    useEffect(() => {
        if (!isOpen) return;
        const checkIntegration = async () => {
            try {
                console.log("Checking integrations...");
                const res = await fetch('/api/integrations/');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const google = data.find(i => i.crm_type === 'google_search' && i.is_connected);
                        setHasGoogleApi(!!google);
                    }
                }
            } catch (e) {
                console.error("Failed to check integrations", e);
            }
        };
        checkIntegration();
    }, [isOpen]);

    // Poll for run status
    useEffect(() => {
        let interval;
        if (leadRunId && runStatus !== 'completed' && runStatus !== 'failed') {
            interval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/workspaces/1/lead-runs/${leadRunId}`);
                    if (response.ok) {
                        const data = await response.json();
                        setRunStatus(data.status);
                        setRunStats(data.stats);
                        if (data.status === 'completed') {
                            if (onLeadsImported) onLeadsImported([]);
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [leadRunId, runStatus, onLeadsImported]);

    const toggleSelect = (idx) => {
        if (selectedIndices.includes(idx)) {
            setSelectedIndices(selectedIndices.filter(i => i !== idx));
        } else {
            setSelectedIndices([...selectedIndices, idx]);
        }
    };

    const handleStartRun = async (e) => {
        e?.preventDefault();
        if (weeklyUsage >= (weeklyLimit || 100)) { // Safe fallback
            setError(`Weekly limit reached (${weeklyLimit} leads). Upgrade your plan.`);
            return;
        }

        setLoading(true);
        setError(null);
        setLeadRunId(null);
        setRunStatus('starting');
        setRunStats(null);
        setResults([]);

        try {
            console.log("Starting run...");
            const response = await fetch(`/api/workspaces/1/lead-runs/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config_override: {
                        keywords,
                        location,
                        platform,
                        limit: 10
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to start run");
            }

            const data = await response.json();
            setLeadRunId(data.id);
            setRunStatus('queued');
        } catch (err) {
            console.error("Start run error", err);
            setError(err.message || 'Failed to start sourcing.');
            setLoading(false);
            setRunStatus('failed');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-4xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-900 z-10">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-400" />
                            Lead Sourcer
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                            Scrape the web for potential leads.
                            {weeklyLimit !== undefined && (
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 text-xs font-medium">
                                    Limit: {weeklyLimit}
                                </span>
                            )}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    <form onSubmit={handleStartRun} className="space-y-4 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Industry</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        required
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-white focus:outline-none focus:border-blue-500"
                                        placeholder="e.g. Marketing"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="e.g. New York"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={loading || runStatus === 'queued' || runStatus === 'running'}
                                    className="w-full h-[42px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center transition-all disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Run"}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Status */}
                    {(runStatus === 'queued' || runStatus === 'running' || runStatus === 'completed') && (
                        <div className="mb-6 p-6 bg-blue-500/5 rounded-xl border border-blue-500/20 text-center">
                            {runStatus === 'completed' ? (
                                <div>
                                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                    <h4 className="text-white font-bold">Run Completed</h4>
                                    <p className="text-gray-400">Found {runStats?.leads_created || 0} leads.</p>
                                </div>
                            ) : (
                                <div>
                                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                                    <h4 className="text-white font-bold">Sourcing...</h4>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-bold text-white">Found {results.length} Candidates</h4>
                                <div className="text-xs text-gray-400">
                                    {selectedIndices.length} selected
                                </div>
                            </div>

                            <div className="border border-white/10 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-white/5 uppercase text-xs font-medium text-gray-300">
                                        <tr>
                                            <th className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedIndices(results.map((_, i) => i));
                                                        else setSelectedIndices([]);
                                                    }}
                                                    checked={selectedIndices.length === results.length}
                                                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-offset-gray-900"
                                                />
                                            </th>
                                            <th className="p-4">Name / Title</th>
                                            <th className="p-4">Description</th>
                                            <th className="p-4 w-20">Source</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {results.map((item, idx) => (
                                            <tr key={idx} className={`hover:bg-white/5 transition-colors ${selectedIndices.includes(idx) ? 'bg-blue-500/5' : ''}`}>
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIndices.includes(idx)}
                                                        onChange={() => toggleSelect(idx)}
                                                        className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-offset-gray-900"
                                                    />
                                                </td>
                                                <td className="p-4 font-medium text-white max-w-[200px] truncate">
                                                    {item.name}
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-400 hover:underline mt-0.5 truncate">
                                                        {item.url}
                                                    </a>
                                                </td>
                                                <td className="p-4 max-w-md truncate" title={item.description}>
                                                    {item.description}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded text-[10px] font-medium bg-white/10 text-gray-300">
                                                        {item.source}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {results.length === 0 && !loading && !error && (
                        <div className="text-center py-12 text-gray-500">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Enter criteria above to start sourcing leads.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
