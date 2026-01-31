import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RotateCw, X, Calendar, Plus, Trash2, CheckCircle2, StickyNote, Linkedin, Send, AlertTriangle, Circle, Pencil, Clock, AlertCircle, Flame, Mail, Phone, CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../config';

export default function PipelineCard({ deal, stageColor, onMove, onQuickAction, onDisqualify, onAddTask, onEditTask, onEditDeal, refreshTrigger }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'notes'
    const [tasks, setTasks] = useState([]);
    const [notes, setNotes] = useState([]); // New Notes State
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [loadingNotes, setLoadingNotes] = useState(false); // New Loading
    const [newNoteContent, setNewNoteContent] = useState('');
    const noteInputRef = React.useRef(null);

    // Refresh listener
    useEffect(() => {
        if (refreshTrigger) {
            fetchTasks();
        }
    }, [refreshTrigger]);

    // --- Helper Functions ---
    if (!deal) return null;

    const getDealHealth = (deal) => {
        try {
            let health = { status: 'success', icon: Circle, color: 'text-green-500', reason: 'On Track' };

            const lead = deal.lead;
            if (!lead || typeof lead !== 'object') return health;

            const now = new Date();
            const daysSinceContact = lead.last_contacted_at
                ? (now - new Date(lead.last_contacted_at)) / (1000 * 60 * 60 * 24)
                : 30; // Treat no contact as very old

            // 1. Way Behind (Red)
            if (daysSinceContact > 14) {
                return { status: 'danger', icon: AlertTriangle, color: 'text-red-500', reason: 'Way Behind: No contact > 14 days' };
            }

            // Check for overdue tasks (hypothetically, if we had task data here instantly)
            // For now, rely on standard "action needed" logic or passed down props if needed.
            // Simplified: relying on `lead.next_scheduled_action` if available
            if (lead.next_scheduled_action && new Date(lead.next_scheduled_action) < now) {
                return { status: 'danger', icon: AlertTriangle, color: 'text-red-500', reason: 'Way Behind: Overdue Action' };
            }

            // 2. Slightly Behind (Yellow)
            if (daysSinceContact > 7) {
                return { status: 'warning', icon: AlertCircle, color: 'text-yellow-500', reason: 'Slightly Behind: No contact > 7 days' };
            }

            // Check if action due today
            if (lead.next_scheduled_action) {
                const actionDate = new Date(lead.next_scheduled_action);
                if (actionDate.toDateString() === now.toDateString()) {
                    return { status: 'warning', icon: AlertCircle, color: 'text-yellow-500', reason: 'Slightly Behind: Action due today' };
                }
            }

            return health;
        } catch (e) {
            console.error("getDealHealth error", e, deal);
            return { status: 'success', icon: Circle, color: 'text-gray-500', reason: 'Error calculating health' };
        }
    };

    const getCardAlerts = (deal) => {
        try {
            const alerts = [];
            const lead = deal.lead;

            if (lead) {
                // Stale Alert: No contact in 7 days
                if (lead.last_contacted_at) {
                    const daysSince = (new Date() - new Date(lead.last_contacted_at)) / (1000 * 60 * 60 * 24);
                    if (daysSince > 7) {
                        alerts.push({ type: 'warning', icon: Clock, text: 'Stale (>7d)' });
                    }
                } else {
                    alerts.push({ type: 'warning', icon: Clock, text: 'No Contact' });
                }

                // Action Needed
                if (lead.next_scheduled_action && new Date(lead.next_scheduled_action) < new Date()) {
                    alerts.push({ type: 'danger', icon: AlertCircle, text: 'Action Due' });
                }

                // Hot Lead
                if (lead.score > 80) {
                    alerts.push({ type: 'success', icon: Flame, text: 'Hot Lead' });
                }
            }
            return alerts;
        } catch (e) {
            console.error("getCardAlerts error", e);
            return [];
        }
    };

    const alerts = getCardAlerts(deal);
    const health = getDealHealth(deal);

    // --- Data Fetching ---
    const fetchTasks = async () => {
        if (loadingTasks) return;
        setLoadingTasks(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${deal.id}`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        } finally {
            setLoadingTasks(false);
        }
    };

    const fetchNotes = async () => {
        if (!deal.lead_id) return;
        setLoadingNotes(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/leads/${deal.lead_id}/notes`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data);
            }
        } catch (err) {
            console.error("Failed to fetch notes", err);
        } finally {
            setLoadingNotes(false);
        }
    };

    const handleFlip = () => {
        if (!isFlipped) {
            fetchTasks();
            fetchNotes();
        }
        setIsFlipped(!isFlipped);
    };

    const openQuickTab = (tab) => {
        if (!isFlipped) {
            setIsFlipped(true);
            fetchTasks();
            fetchNotes();
        }
        setActiveTab(tab);
        // Auto-focus note input if that's the tab
        if (tab === 'notes') {
            setTimeout(() => {
                noteInputRef.current?.focus();
            }, 600); // Wait for flip animation
        }
    };

    // --- Task Handlers --- (unchanged)


    const toggleTask = async (task) => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
        try {
            await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: !task.is_completed })
            });
        } catch (err) {
            fetchTasks(); // partial revert
        }
    };

    const deleteTask = async (taskId) => {
        if (!confirm("Delete this task?")) return;
        try {
            await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, { method: 'DELETE' });
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error("Failed to delete task", err);
        }
    };

    // --- Note Handlers ---
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNoteContent.trim() || !deal.lead_id) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/leads/${deal.lead_id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newNoteContent })
            });
            if (res.ok) {
                setNewNoteContent('');
                fetchNotes();
            }
        } catch (err) {
            console.error("Failed to add note", err);
        }
    };


    return (
        <div className="relative w-full h-64 group perspective-1000">
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="w-full h-full relative preserve-3d"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* --- FRONT FACE --- */}
                <div className="absolute inset-0 backface-hidden flex flex-col p-3 rounded-xl bg-gray-900/80 border border-white/10 hover:border-blue-500/50 hover:bg-gray-900 transition-all shadow-lg">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs text-blue-400 uppercase tracking-wider font-bold truncate max-w-[120px]">
                                    {deal.lead?.company || 'Unknown Company'}
                                </span>
                                {/* Health Indicator */}
                                <div className="tooltip-container relative group/tooltip">
                                    <health.icon
                                        className={cn("w-3.5 h-3.5 cursor-help", health.color)}
                                        strokeWidth={3}
                                    />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-xl">
                                        {health.reason}
                                    </div>
                                </div>
                            </div>
                            <h4 className="font-semibold text-white text-sm leading-tight line-clamp-2" title={deal.title}>{deal.title}</h4>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEditDeal(deal); }}
                                className="text-gray-600 hover:text-white transition-colors p-0.5"
                                title="Edit Deal"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold text-green-400 block">${deal.value.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Alerts (Middle) */}
                    <div className="flex-1">
                        {alerts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                                {alerts.map((alert, idx) => (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                        alert.type === 'warning' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                            alert.type === 'danger' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                "bg-green-500/10 text-green-400 border-green-500/20"
                                    )}>
                                        <alert.icon className="w-3 h-3" />
                                        {alert.text}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer: Quick Actions (2 Rows) */}
                    <div className="mt-auto pt-2 border-t border-white/5 flex flex-col gap-2">
                        {/* Row 1: Quick Tools (Common Actions) */}
                        <div className="flex items-center justify-between gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onQuickAction('email', deal); }}
                                className="flex-1 p-1.5 bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 rounded-lg transition-colors flex justify-center"
                                title="Send Email"
                            >
                                <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onQuickAction('sms', deal); }}
                                className="flex-1 p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors flex justify-center"
                                title="Send SMS"
                            >
                                <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onQuickAction('linkedin', deal); }}
                                className="flex-1 p-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-lg transition-colors flex justify-center"
                                title="LinkedIn DM"
                            >
                                <Linkedin className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddTask(deal); }}
                                className="flex-1 p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors flex justify-center"
                                title="Add Task"
                            >
                                <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); openQuickTab('notes'); }}
                                className="flex-1 p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors flex justify-center"
                                title="Add Note"
                            >
                                <StickyNote className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Row 2: Deal Management */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleFlip(); }}
                                className="flex-1 py-1.5 px-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                            >
                                <RotateCw className="w-3.5 h-3.5" /> Details
                            </button>

                            {onMove && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMove(deal.id); }}
                                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium shadow-lg shadow-blue-900/20"
                                >
                                    Move Stage &rarr;
                                </button>
                            )}

                            <button
                                onClick={(e) => { e.stopPropagation(); onDisqualify(deal); }}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500/40 hover:text-red-400 transition-colors"
                                title="Disqualify Deal"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- BACK FACE --- */}
                <div
                    className="absolute inset-0 backface-hidden flex flex-col p-0 rounded-lg bg-gray-800 border border-purple-500/30 shadow-xl overflow-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                >
                    {/* Header / Tabs */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/20">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={cn("text-[10px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-1", activeTab === 'tasks' ? "bg-purple-500/20 text-purple-300" : "text-gray-500 hover:text-gray-300")}
                            >
                                <CheckSquare className="w-3 h-3" /> Tasks
                            </button>
                            <button
                                onClick={() => setActiveTab('notes')}
                                className={cn("text-[10px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-1", activeTab === 'notes' ? "bg-purple-500/20 text-purple-300" : "text-gray-500 hover:text-gray-300")}
                            >
                                <StickyNote className="w-3 h-3" /> Notes
                            </button>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleFlip(); }} className="text-gray-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-900">
                        {activeTab === 'tasks' && (
                            <div className="space-y-4">
                                {/* Add Task Button */}
                                <button
                                    onClick={() => onAddTask(deal)}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-purple-900/20 mb-3"
                                >
                                    <Plus className="w-4 h-4" /> Add Task
                                </button>

                                {/* Timeline Task List */}
                                <div className="space-y-0 relative ml-2 pl-4 border-l-2 border-white/10 py-1">
                                    {loadingTasks ? (
                                        <div className="text-center text-xs text-gray-500 py-2">Loading tasks...</div>
                                    ) : tasks.length === 0 ? (
                                        <div className="text-xs text-gray-500 italic pl-1">No tasks yet.</div>
                                    ) : (
                                        tasks.map(task => (
                                            <div key={task.id} className="relative mb-4 last:mb-0 group">
                                                {/* Timeline Dot */}
                                                <div className={cn(
                                                    "absolute -left-[21px] top-0.5 w-3 h-3 rounded-full border-2 transition-colors bg-gray-900",
                                                    task.is_completed ? "border-green-500 bg-green-500" : "border-gray-600 group-hover:border-purple-400"
                                                )}></div>

                                                <div className="flex justify-between items-start gap-2">
                                                    <div
                                                        onClick={() => toggleTask(task)}
                                                        className={cn("flex-1 cursor-pointer transition-colors hover:text-purple-300", task.is_completed ? "opacity-50 line-through text-gray-500" : "text-gray-300")}
                                                    >
                                                        <p className="text-sm leading-tight">{task.title}</p>
                                                        {task.priority && <span className="text-[10px] text-gray-500 uppercase tracking-widest">{task.priority}</span>}
                                                    </div>

                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onEditTask(task, deal); }}
                                                            className="text-gray-600 hover:text-blue-400"
                                                            title="Edit Task"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => deleteTask(task.id)} className="text-gray-600 hover:text-red-400">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="space-y-2">
                                {/* Mini Add Note */}
                                {/* Add Note Form */}
                                <form onSubmit={handleAddNote} className="mb-3 relative">
                                    <div className="relative">
                                        <textarea
                                            ref={noteInputRef}
                                            value={newNoteContent}
                                            onChange={(e) => setNewNoteContent(e.target.value)}
                                            placeholder="Type a note..."
                                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:border-yellow-500/50 outline-none placeholder:text-gray-600 resize-none"
                                            rows="2"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newNoteContent.trim()}
                                            className="absolute right-2 bottom-2 p-1.5 bg-yellow-600 text-black rounded-md hover:bg-yellow-500 disabled:opacity-50 transition-colors"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </form>

                                {/* Notes List */}
                                <div className="space-y-2">
                                    {loadingNotes ? (
                                        <div className="text-center text-[10px] text-gray-500 py-2">Loading...</div>
                                    ) : notes.length === 0 ? (
                                        <div className="text-center text-[10px] text-gray-500 py-2">No notes</div>
                                    ) : (
                                        notes.map(note => (
                                            <div key={note.id} className="p-2 rounded bg-white/5 text-[10px] text-gray-300 border border-white/5">
                                                <p>{note.content}</p>
                                                <div className="mt-1 text-gray-600 text-[9px] text-right">
                                                    {format(new Date(note.created_at), 'MMM d, h:mm a')}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>


        </div >
    );
}
