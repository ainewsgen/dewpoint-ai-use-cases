import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query'; // Assuming react-query or similar, but for consistency with project style I will use useEffect + fetch
import { ArrowLeft, Users, BarChart2, GitMerge, Settings, Play, Pause, Save, Loader2 } from 'lucide-react';
import WorkflowEditor from './WorkflowEditor';
import { fetchCampaign, addCampaignStep, deleteCampaignStep, updateCampaignStep, addLeadsToCampaign, updateCampaign, launchCampaign, triggerCampaignRun } from '../../lib/api_campaigns_v2';
import { fetchTemplates } from '../../lib/api_templates';
import AddLeadsToCampaignModal from './AddLeadsToCampaignModal';

export default function CampaignDetail({ campaignId, onBack }) {
    const [activeTab, setActiveTab] = useState('workflow'); // workflow, leads, settings
    const [campaign, setCampaign] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddLeadsModal, setShowAddLeadsModal] = useState(false);

    const handleAddLeads = async (leadIds) => {
        try {
            await addLeadsToCampaign(campaign.id, leadIds);
            setShowAddLeadsModal(false);
            loadData(); // Reload to see new leads
            alert(`Added ${leadIds.length} leads successfully!`);
        } catch (err) {
            console.error(err);
            alert("Failed to add leads");
        }
    };

    const handleUpdateCampaign = async (updates) => {
        try {
            const updated = await updateCampaign(campaign.id, updates);
            setCampaign(prev => ({ ...prev, ...updated }));
        } catch (err) {
            console.error(err);
            alert("Failed to update campaign");
        }
    };

    const handleLaunch = async () => {
        if (!confirm("Are you sure you want to launch this campaign? It will start sending emails according to the schedule.")) return;
        try {
            await launchCampaign(campaign.id);
            setCampaign(prev => ({ ...prev, status: 'active' }));
            alert("Campaign launched successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to launch campaign: " + err.message);
        }
    };

    const handlePause = async () => {
        try {
            await handleUpdateCampaign({ status: 'paused' });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadData();
    }, [campaignId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Parallel fetch for speed
            const [campData, tmplData] = await Promise.all([
                fetchCampaign(campaignId),
                fetchTemplates()
            ]);
            setCampaign(campData);
            setTemplates(tmplData);
        } catch (err) {
            console.error("Failed to load campaign data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStep = async (type) => {
        // Optimistic update or wait for server? Wait for server for ID.
        try {
            const newStep = {
                step_type: type,
                order: campaign.steps.length + 1,
                name: type === 'email' ? 'Follow Up Email' : type === 'delay' ? 'Wait Period' : 'Manual Task',
                wait_days: type === 'delay' ? 2 : 0
            };
            const added = await addCampaignStep(campaign.id, newStep);
            setCampaign(prev => ({ ...prev, steps: [...prev.steps, added] }));
        } catch (err) {
            alert("Failed to add step");
        }
    };

    const handleDeleteStep = async (stepId) => {
        if (!confirm("Remove this step?")) return;
        try {
            await deleteCampaignStep(campaign.id, stepId);
            setCampaign(prev => ({ ...prev, steps: prev.steps.filter(s => s.id !== stepId) }));
        } catch (err) {
            alert("Failed to delete step");
        }
    };

    const handleUpdateStep = async (stepId, updates) => {
        // Optimistic update locally
        setCampaign(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
        }));

        // Debounce or save on blur in real app. For MVP, we might need a distinct 'Save' button or auto-save.
        // Assuming updateCampaignStep exists
        // await updateCampaignStep(campaign.id, stepId, updates); 
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;
    if (!campaign) return <div className="p-10 text-center text-red-400">Campaign not found</div>;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${campaign.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                            <span className="text-sm text-gray-400 capitalize">{campaign.status}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10">
                        <Settings className="w-4 h-4" />
                    </button>
                    {campaign.status === 'draft' || campaign.status === 'paused' || campaign.status === 'completed' ? (
                        <button
                            onClick={handleLaunch}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" /> Launch
                        </button>
                    ) : (
                        <button
                            onClick={handlePause}
                            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            <Pause className="w-4 h-4" /> Pause
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit mb-6">
                {[
                    { id: 'workflow', label: 'Workflow', icon: GitMerge },
                    { id: 'leads', label: 'Leads', icon: Users },
                    { id: 'settings', label: 'Settings', icon: Settings },
                    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'workflow' && (
                    <WorkflowEditor
                        steps={campaign.steps}
                        templates={templates}
                        onAddStep={handleAddStep}
                        onDeleteStep={handleDeleteStep}
                        onUpdateStep={handleUpdateStep}
                    />
                )}

                {activeTab === 'leads' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Campaign Participants</h3>
                            <button
                                onClick={() => setShowAddLeadsModal(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium flex items-center gap-2"
                            >
                                <Users className="w-4 h-4" /> Add Leads
                            </button>
                        </div>

                        {campaign.leads && campaign.leads.length > 0 ? (
                            <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-medium">Lead</th>
                                            <th className="p-4 font-medium">Company</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium">Current Step</th>
                                            <th className="p-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {campaign.leads.map(clead => (
                                            <tr key={clead.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-white">{clead.lead_name || `Lead #${clead.lead_id}`}</div>
                                                    <div className="text-xs text-gray-500">{clead.lead_email}</div>
                                                </td>
                                                <td className="p-4 text-gray-400 text-sm">--</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${clead.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        clead.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                        {clead.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-400 text-sm">
                                                    {clead.current_step_id ? `Step ${clead.current_step_id}` : 'Start'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button className="text-gray-500 hover:text-red-400 transition-colors">
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-xl border border-dashed border-gray-700">
                                <Users className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-300">No leads yet</h3>
                                <p className="text-gray-500 mb-6">Add leads to start this campaign.</p>
                                <button
                                    onClick={() => setShowAddLeadsModal(true)}
                                    className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg"
                                >
                                    Select Leads
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-gray-900 border border-white/10 p-6 rounded-xl">
                            <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Sent</div>
                            <div className="text-3xl font-bold text-white">{campaign.sent_count}</div>
                        </div>
                        <div className="bg-gray-900 border border-white/10 p-6 rounded-xl">
                            <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Opens</div>
                            <div className="text-3xl font-bold text-blue-400">{campaign.open_count}</div>
                        </div>
                        <div className="bg-gray-900 border border-white/10 p-6 rounded-xl">
                            <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Replies</div>
                            <div className="text-3xl font-bold text-purple-400">{campaign.reply_count}</div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="bg-gray-900 rounded-xl border border-white/10 p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-white mb-4">General Settings</h3>
                            <div className="grid grid-cols-1 gap-6 max-w-2xl">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Campaign Name</label>
                                    <input
                                        type="text"
                                        defaultValue={campaign.name}
                                        onBlur={(e) => handleUpdateCampaign({ name: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Campaign name (auto-saves on blur).</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Campaign Status</label>
                                    <select
                                        value={campaign.status}
                                        onChange={(e) => handleUpdateCampaign({ status: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="paused">Paused</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Aggression Level</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['low', 'medium', 'high'].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => handleUpdateCampaign({ aggression_level: level })}
                                                className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors
                                                    ${campaign.aggression_level === level
                                                        ? 'bg-blue-600/20 border-blue-600 text-blue-400'
                                                        : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Determines follow-up frequency.</p>
                                </div>

                                <div className="border-t border-white/5 pt-6">
                                    <h4 className="text-sm font-bold text-white mb-4">Scheduling & Constraints</h4>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Timezone</label>
                                            <select
                                                value={campaign.schedule_config?.timezone || 'UTC'}
                                                onChange={(e) => handleUpdateCampaign({
                                                    schedule_config: { ...campaign.schedule_config, timezone: e.target.value }
                                                })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="UTC">UTC (Coordinated Universal Time)</option>
                                                <option value="US/Pacific">Pacific Time (US/Canada)</option>
                                                <option value="US/Eastern">Eastern Time (US/Canada)</option>
                                                <option value="Europe/London">London</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Start Time</label>
                                                <input
                                                    type="time"
                                                    value={campaign.schedule_config?.start_time || "09:00"}
                                                    onChange={(e) => handleUpdateCampaign({
                                                        schedule_config: { ...campaign.schedule_config, start_time: e.target.value }
                                                    })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">End Time</label>
                                                <input
                                                    type="time"
                                                    value={campaign.schedule_config?.end_time || "17:00"}
                                                    onChange={(e) => handleUpdateCampaign({
                                                        schedule_config: { ...campaign.schedule_config, end_time: e.target.value }
                                                    })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Active Days</label>
                                            <div className="flex gap-2">
                                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                                    const days = campaign.schedule_config?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                                                    const isActive = days.includes(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            onClick={() => {
                                                                const newDays = isActive
                                                                    ? days.filter(d => d !== day)
                                                                    : [...days, day];
                                                                handleUpdateCampaign({
                                                                    schedule_config: { ...campaign.schedule_config, days: newDays }
                                                                });
                                                            }}
                                                            className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors
                                                                ${isActive
                                                                    ? 'bg-blue-600 border-blue-500 text-white'
                                                                    : 'bg-black/20 border-white/10 text-gray-500 hover:text-gray-300'}`}
                                                        >
                                                            {day.slice(0, 1)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-white/5 pt-6">
                                    <h4 className="text-sm font-bold text-white mb-4">Debug Actions</h4>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await triggerCampaignRun();
                                                alert("Run Triggered: " + JSON.stringify(res));
                                            } catch (e) {
                                                alert("Error: " + e.message);
                                            }
                                        }}
                                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-white/10 text-xs"
                                    >
                                        Trigger Manual Run (Test)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Modals */}
            <AddLeadsToCampaignModal
                isOpen={showAddLeadsModal}
                onClose={() => setShowAddLeadsModal(false)}
                onAdd={handleAddLeads}
                campaignName={campaign?.name}
            />
        </div>
    );
}
