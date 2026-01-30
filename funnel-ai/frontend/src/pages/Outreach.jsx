import React, { useState, useEffect } from 'react';
import { Plus, Mail, MessageSquare, Play, Pause, BarChart2, Loader2, GripVertical } from 'lucide-react';
import { fetchCampaigns, createCampaign } from '../lib/api_campaigns_v2';
import CampaignDetail from '../components/campaigns/CampaignDetail';
import { cn } from '../lib/utils';

export default function Outreach() {
    const [selectedCampaignId, setSelectedCampaignId] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCampaignName, setNewCampaignName] = useState('');

    useEffect(() => {
        if (!selectedCampaignId) {
            loadCampaigns();
        }
    }, [selectedCampaignId]);

    const loadCampaigns = async () => {
        try {
            const data = await fetchCampaigns();
            setCampaigns(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newCampaignName) return;

        try {
            await createCampaign({ name: newCampaignName, type: 'email' });
            setShowCreateModal(false);
            setNewCampaignName('');
            loadCampaigns();
        } catch (err) {
            alert('Failed to create campaign');
        }
    };

    // --- Sub-View Navigation ---
    if (selectedCampaignId) {
        return <CampaignDetail campaignId={selectedCampaignId} onBack={() => setSelectedCampaignId(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Outreach Campaigns</h2>
                    <p className="text-gray-400 mt-1">Automate and track your prospect engagement.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Campaign
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.length === 0 && (
                        <div className="col-span-full text-center py-12 border border-dashed border-gray-700 rounded-xl bg-white/5">
                            <p className="text-gray-400">No campaigns yet. Create one to get started!</p>
                        </div>
                    )}
                    {campaigns.map((camp) => (
                        <div
                            key={camp.id}
                            onClick={() => setSelectedCampaignId(camp.id)}
                            className="group relative p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-blue-500/30 transition-all cursor-pointer hover:bg-white/10"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium border",
                                    camp.status === 'active' ? "border-green-500/20 text-green-400 bg-green-500/10" : "border-gray-500/20 text-gray-400 bg-gray-500/10"
                                )}>
                                    {camp.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-2">{camp.name}</h3>
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                                {camp.workflow_type === 'linear' ? 'Linear Sequence' : 'Adaptive AI Workflow'}
                            </p>

                            <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 mb-4">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-white">{camp.sent_count}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Sent</div>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <div className="text-lg font-bold text-blue-400">{camp.open_count}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Opens</div>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <div className="text-lg font-bold text-purple-400">{camp.reply_count}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Replies</div>
                                </div>
                            </div>

                            <button className="w-full py-2 bg-white/5 hover:bg-blue-600 hover:text-white rounded-lg text-sm text-gray-300 transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg">
                                Manage Campaign &rarr;
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Create New Campaign</h3>
                        <form onSubmit={handleCreate}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    value={newCampaignName}
                                    onChange={(e) => setNewCampaignName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="e.g. Q1 Cold Outreach"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newCampaignName}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
                                >
                                    Create Campaign
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
