import React, { useState, useEffect } from 'react';
import { fetchStages, fetchDeals, moveDeal, createDeal, updateDeal } from '../lib/api_pipeline';
import { disqualifyLead } from '../lib/api';
import { Plus, MoreHorizontal, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import OutreachModal from '../components/OutreachModal';
import PipelineCard from '../components/PipelineCard';
import DisqualifyModal from '../components/DisqualifyModal';
import EventFormModal from '../components/EventFormModal';
import DealFormModal from '../components/DealFormModal'; // Import new component
import { API_BASE_URL } from '../config';

export default function Pipeline() {
    const [stages, setStages] = useState([]);
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);

    // Deal Modal State (Combined Add/Edit)
    const [dealModal, setDealModal] = useState({ isOpen: false, deal: null, isEdit: false });

    // Outreach State
    const [outreachConfig, setOutreachConfig] = useState(null); // { isOpen: false, lead: null, type: 'email' }

    // Disqualify State
    const [disqualifyModal, setDisqualifyModal] = useState({ isOpen: false, deal: null });

    // Task Modal State (Lifted Up)
    const [taskModal, setTaskModal] = useState({ isOpen: false, deal: null, task: null, isEdit: false });

    // Refresh Triggers for Cards
    const [refreshTriggers, setRefreshTriggers] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [stagesData, dealsData] = await Promise.all([fetchStages(), fetchDeals()]);
            setStages(stagesData);
            setDeals(dealsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDeal = async (data) => {
        try {
            if (dealModal.isEdit && dealModal.deal) {
                // UPDATE
                await updateDeal(dealModal.deal.id, data);
            } else {
                // CREATE
                await createDeal(data);
            }
            setDealModal({ isOpen: false, deal: null, isEdit: false });
            loadData();
        } catch (err) {
            alert('Failed to save deal');
        }
    };

    const handleMoveDeal = async (dealId, targetStageId) => {
        // Optimistic update
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: targetStageId } : d));

        try {
            await moveDeal(dealId, targetStageId);
        } catch (err) {
            console.error("Failed to move deal", err);
            loadData(); // Revert on error
        }
    };

    const getStageColor = (colorName) => {
        const map = {
            slate: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
            blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
            orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
            purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
            pink: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
            yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
            green: 'bg-green-500/10 border-green-500/20 text-green-400',
        };
        return map[colorName] || map['blue'];
    };

    const handleQuickAction = (action, deal) => {
        if (!deal.lead) {
            alert("This deal is not linked to a lead with contact info.");
            return;
        }
        setOutreachConfig({
            isOpen: true,
            lead: deal.lead,
            type: action // 'email', 'sms', 'linkedin'
        });
    };

    const handleDisqualify = (deal) => {
        setDisqualifyModal({ isOpen: true, deal });
    };

    const handleDisqualifyConfirm = async (reason) => {
        const deal = disqualifyModal.deal;
        if (!deal) return;

        // Optimistic Update: Remove from UI immediately
        setDeals(prev => prev.filter(d => d.id !== deal.id));
        setDisqualifyModal({ isOpen: false, deal: null });

        try {
            if (deal.lead_id) {
                await disqualifyLead(deal.lead_id, reason);
            }
            // Ideally we also delete the deal or mark it lost, 
            // dependent on backend. modifying lead status might be enough for MVP
            // or we might need moveDeal(deal.id, lostStageId).
            // For now, assuming disqualifying the lead 'kills' the deal in the pipeline view concept.
        } catch (err) {
            console.error("Failed to disqualify", err);
            loadData(); // Revert on error
            alert("Failed to disqualify deal.");
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6 px-1">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">$Funnel Pipeline</h2>
                    <p className="text-gray-400 mt-1">Manage your deals from cold to close.</p>
                </div>
                <button
                    onClick={() => setDealModal({ isOpen: true, deal: null, isEdit: false })}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Deal
                </button>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-max px-1">
                    {stages.map((stage, index) => {
                        const stageDeals = deals.filter(d => d.stage_id === stage.id);
                        const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                        const nextStage = stages[index + 1];

                        return (
                            <div key={stage.id} className="w-80 flex-shrink-0 flex flex-col rounded-xl bg-black/20 border border-white/5 backdrop-blur-sm">
                                {/* Column Header */}
                                <div className={cn("p-4 border-b border-white/5 flex justify-between items-center bg-opacity-10", getStageColor(stage.color).split(' ')[0])}>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-200">{stage.name}</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-black/20 text-xs text-white/70 font-mono">{stageDeals.length}</span>
                                    </div>
                                    <button className="text-white/50 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                                </div>

                                {/* Deals List */}
                                <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                    {stageDeals.map(deal => (
                                        <PipelineCard
                                            key={deal.id}
                                            deal={deal}
                                            stageColor={stage.color}
                                            onMove={nextStage ? (id) => handleMoveDeal(id, nextStage.id) : null}
                                            onQuickAction={handleQuickAction}
                                            onDisqualify={handleDisqualify}
                                            onAddTask={(deal) => setTaskModal({ isOpen: true, deal, isEdit: false })}
                                            onEditTask={(task, deal) => setTaskModal({ isOpen: true, deal, task, isEdit: true })}
                                            onEditDeal={(deal) => setDealModal({ isOpen: true, deal, isEdit: true })}
                                            refreshTrigger={refreshTriggers[deal.id]}
                                        />
                                    ))}
                                </div>

                                {/* Column Footer */}
                                <div className="p-3 border-t border-white/5 bg-black/20 rounded-b-xl flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total Value</span>
                                    <span className="text-sm font-bold text-gray-300">${totalValue.toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Deal Form Modal */}
            <DealFormModal
                isOpen={dealModal.isOpen}
                onClose={() => setDealModal({ isOpen: false, deal: null, isEdit: false })}
                onSubmit={handleSaveDeal}
                stages={stages}
                initialData={dealModal.deal}
                isEditMode={dealModal.isEdit}
            />

            {/* Outreach Modal */}
            <OutreachModal
                isOpen={!!outreachConfig?.isOpen}
                onClose={() => setOutreachConfig(null)}
                lead={outreachConfig?.lead}
                type={outreachConfig?.type}
                onSend={async (type, draft) => {
                    // This functionality would ideally be connected to the actionApi
                    // For now, we simulate success as this is an enhancement focused on the Pipeline view
                    console.log(`Sending ${type} to deal lead...`);
                    // alert(`${type} sent successfully!`); // Avoid intrusive alerts
                }}
            />

            <DisqualifyModal
                isOpen={disqualifyModal.isOpen}
                onClose={() => setDisqualifyModal({ isOpen: false, deal: null })}
                onConfirm={handleDisqualifyConfirm}
                leadName={disqualifyModal.deal?.title}
            />

            {/* Shared Task Modal */}
            <EventFormModal
                isOpen={taskModal.isOpen}
                onClose={() => setTaskModal({ isOpen: false, deal: null, task: null })}
                onSubmit={async (data) => {
                    try {
                        const payload = {
                            title: data.title,
                            description: data.notes, // Map notes to description
                            type: data.type,
                            priority: 'medium', // Default
                            due_date: new Date(data.scheduled_at).toISOString(),
                            lead_id: data.lead_id || (taskModal.deal?.lead_id),
                            deal_id: taskModal.deal?.id
                        };

                        let res;
                        if (taskModal.isEdit && taskModal.task) {
                            // EDIT MODE
                            res = await fetch(`${API_BASE_URL}/api/tasks/${taskModal.task.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    ...payload,
                                    is_completed: data.status === 'completed'
                                })
                            });
                        } else {
                            // CREATE MODE
                            res = await fetch(`${API_BASE_URL}/api/tasks`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });
                        }

                        if (res.ok) {
                            setTaskModal({ isOpen: false, deal: null, task: null });
                            // Trigger refresh for this specific deal card
                            if (taskModal.deal) {
                                setRefreshTriggers(prev => ({
                                    ...prev,
                                    [taskModal.deal.id]: Date.now()
                                }));
                            }
                        } else {
                            alert("Failed to save task");
                        }
                    } catch (err) {
                        console.error("Task save failed", err);
                    }
                }}
                isEditMode={taskModal.isEdit}
                title={taskModal.isEdit ? "Edit Task" : "Add Deal Task"}
                initialData={taskModal.isEdit && taskModal.task ? {
                    title: taskModal.task.title,
                    description: taskModal.task.description,
                    type: taskModal.task.type,
                    scheduled_at: taskModal.task.due_date ? new Date(taskModal.task.due_date).toISOString().slice(0, 16) : '',
                    status: taskModal.task.is_completed ? 'completed' : 'pending',
                    lead_id: taskModal.task.lead_id,
                    notes: taskModal.task.description // Map description back to notes
                } : (taskModal.deal ? {
                    lead_id: taskModal.deal.lead_id,
                    type: 'task',
                    scheduled_at: new Date().toISOString().slice(0, 16)
                } : {})}
                leads={taskModal.deal ? [taskModal.deal.lead].filter(Boolean) : []}
            />
        </div>
    );
}
