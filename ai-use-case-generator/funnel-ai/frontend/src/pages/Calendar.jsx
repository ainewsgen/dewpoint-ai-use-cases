import React, { useState, useEffect } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    isPast,
    isFuture,
    addDays,
    startOfDay,
    compareAsc
} from 'date-fns';
import {
    Calendar as CalendarIcon,
    Lock,
    List,
    ChevronLeft,
    ChevronRight,
    Download,
    CheckCircle,
    Circle,
    Phone,
    Mail,
    Users,
    Clock,
    FileText,
    Plus,
    X,
    Trash2,
    Edit2,
    Loader2,
    SquareKanban,
    Sparkles,
    Check,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../lib/api_calendar';
import { fetchLeads } from '../lib/api';
import { generateTaskSuggestions } from '../lib/api_ai';
import { API_BASE_URL } from '../config';
import EventFormModal from '../components/EventFormModal';

const TYPE_ICONS = {
    call: Phone,
    email: Mail,
    meeting: Users,
    task: CheckCircle,
    linkedin: FileText
};

const TYPE_COLORS = {
    call: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    email: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    meeting: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    task: 'text-green-400 bg-green-400/10 border-green-400/20',
    linkedin: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
};

const PRIORITY_COLORS = {
    high: 'text-red-400 bg-red-400/10 border-red-400/20',
    medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    low: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
};

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [leads, setLeads] = useState([]);
    const [view, setView] = useState('list');
    const [filterStatus, setFilterStatus] = useState('active'); // 'active' | 'completed'
    const [loading, setLoading] = useState(true);

    // ... (Modals state unchanged)
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSmartPlanOpen, setIsSmartPlanOpen] = useState(false);
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

    // ... (AI Suggestions & Form Data unchanged)
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const [formData, setFormData] = useState({
        lead_id: '',
        title: '',
        type: 'task',
        scheduled_at: '',
        notes: ''
    });

    // ... (loadData & useEffect unchanged)
    const [features, setFeatures] = useState({});

    // ... (loadData & useEffect unchanged)
    const loadData = async () => {
        setLoading(true);
        try {
            const start = subMonths(startOfMonth(currentDate), 1);
            const end = addMonths(endOfMonth(currentDate), 1);
            const [eventsData, leadsData, userRes] = await Promise.all([
                fetchEvents(start, end),
                fetchLeads(),
                fetch(`${API_BASE_URL}/api/users/me`)
            ]);

            setEvents(eventsData);
            setLeads(leadsData);

            if (userRes.ok) {
                const user = await userRes.json();
                let userTier = (user.plan_tier || 'free').toLowerCase().trim();
                if (userTier === 'free') userTier = 'starter';

                const plansRes = await fetch(`${API_BASE_URL}/api/plans/`);
                if (plansRes.ok) {
                    const plans = await plansRes.json();
                    const currentPlan = plans.find(p => p.name.toLowerCase().trim() === userTier);
                    if (currentPlan) {
                        setFeatures(currentPlan.features || {});
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentDate]);

    // ... (handleCreate unchanged)
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createEvent({
                ...formData,
                scheduled_at: new Date(formData.scheduled_at).toISOString()
            });
            setIsCreateModalOpen(false);
            setFormData({ lead_id: '', title: '', type: 'task', scheduled_at: '', notes: '' });
            loadData();
        } catch (err) {
            alert("Failed to create event");
        }
    };

    // ... (handleUpdate unchanged)
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        try {
            await updateEvent(selectedEvent.id, {
                ...formData,
                scheduled_at: new Date(formData.scheduled_at).toISOString()
            });
            setIsEditMode(false);
            setSelectedEvent(null);
            loadData();
        } catch (err) {
            alert("Failed to update event");
        }
    };

    // NEW: Toggle Complete Handler
    const handleToggleComplete = async (event, e) => {
        if (e) e.stopPropagation();
        const newStatus = event.status === 'completed' ? 'pending' : 'completed';

        // Optimistic Update
        setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, status: newStatus } : ev));

        try {
            await updateEvent(event.id, { status: newStatus });
        } catch (err) {
            console.error("Failed to toggle status", err);
            loadData(); // Revert
        }
    };

    // ... (handleDelete, openCreateModal, openEventDetails, AI Logic unchanged)
    const handleDelete = async () => {
        if (!selectedEvent || !confirm("Are you sure you want to delete this event?")) return;
        try {
            await deleteEvent(selectedEvent.id);
            setSelectedEvent(null);
            loadData();
            setShowDeleteSuccess(true);
        } catch (err) {
            alert("Failed to delete event");
        }
    };

    const openCreateModal = () => {
        const localIso = new Date().toISOString().slice(0, 16);
        setFormData({
            lead_id: leads[0]?.id || '',
            title: '',
            type: 'task',
            scheduled_at: localIso,
            notes: ''
        });
        setIsCreateModalOpen(true);
    };

    const openEventDetails = (event) => {
        setSelectedEvent(event);
        setIsEditMode(false);
        const dt = new Date(event.start);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
        setFormData({
            lead_id: event.lead_id,
            title: event.title,
            type: event.type,
            scheduled_at: dt.toISOString().slice(0, 16),
            notes: event.notes || ''
        });
    };

    const openSmartPlan = async () => {
        setIsSmartPlanOpen(true);
        setLoadingSuggestions(true);
        try {
            const data = await generateTaskSuggestions();
            setSuggestions(data);
        } catch (err) {
            console.error(err);
            setSuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const acceptSuggestion = async (suggestion, idx) => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            await createEvent({
                lead_id: suggestion.lead_id || null, // Allow null
                title: suggestion.title,
                type: suggestion.type,
                scheduled_at: tomorrow.toISOString(),
                notes: `AI Suggestion: ${suggestion.reason}`
            });
            // Remove from list
            setSuggestions(prev => prev.filter((_, i) => i !== idx));
            loadData(); // refresh calendar
        } catch (err) {
            alert("Failed to create task");
        }
    };

    // Navigation and Filtering
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const jumpToToday = () => setCurrentDate(new Date());

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate)),
        end: endOfWeek(endOfMonth(currentDate))
    });

    // APPLY FILTER
    const filteredEvents = events.filter(e => {
        if (filterStatus === 'active') return e.status !== 'completed';
        return e.status === 'completed';
    });

    const getEventsForDay = (day) => {
        return filteredEvents.filter(e => isSameDay(new Date(e.start), day));
    };

    // Kanban Helper (uses filteredEvents)
    const getKanbanEvents = () => {
        const today = startOfDay(new Date());
        const overdue = [];
        const todayList = [];
        const upcoming = [];

        filteredEvents.forEach(e => {
            const date = startOfDay(new Date(e.start));
            if (date < today) overdue.push(e);
            else if (date.getTime() === today.getTime()) todayList.push(e);
            else upcoming.push(e);
        });

        // Sort functions
        const sortFn = (a, b) => new Date(a.start) - new Date(b.start);
        const sortDesc = (a, b) => new Date(b.start) - new Date(a.start);

        // Sorting: Overdue/Today asc, Completed desc (to see recent first)
        if (filterStatus === 'completed') {
            // For completed, maybe simple list is better, but consistency helps
            overdue.sort(sortDesc); // recent first
            todayList.sort(sortDesc);
            upcoming.sort(sortDesc);
        } else {
            overdue.sort(sortFn);
            todayList.sort(sortFn);
            upcoming.sort(sortFn);
        }

        return { overdue, todayList, upcoming };
    };

    const { overdue, todayList, upcoming } = getKanbanEvents();

    return (
        <div className="space-y-6 h-full flex flex-col relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Calendar & Tasks</h2>
                    <p className="text-gray-400 mt-1">Manage your schedule and upcoming actions.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filter Tabs */}
                    <div className="bg-black/40 p-1 rounded-lg border border-white/10 flex mr-2">
                        <button
                            onClick={() => setFilterStatus('active')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === 'active' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                            Open
                        </button>
                        <button
                            onClick={() => setFilterStatus('completed')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === 'completed' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                            Completed
                        </button>
                    </div>

                    {features.smart_plan ? (
                        <button
                            onClick={openSmartPlan}
                            className="hidden md:flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-sm text-white font-medium transition-colors shadow-lg shadow-purple-900/20"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Smart Plan
                        </button>
                    ) : (
                        <button
                            disabled
                            className="hidden md:flex items-center px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-500 font-medium cursor-not-allowed opacity-50"
                            title="Upgrade plan to access Smart Plan"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Smart Plan
                            <Lock className="w-3 h-3 ml-2" />
                        </button>
                    )}
                    <button
                        onClick={openCreateModal}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors shadow-lg shadow-blue-900/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                    </button>
                    <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex">
                        <button onClick={() => setView('month')} className={`p-2 rounded-md transition-colors ${view === 'month' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setView('board')} className={`p-2 rounded-md transition-colors ${view === 'board' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <SquareKanban className="w-4 h-4" />
                        </button>
                        <button onClick={() => setView('list')} className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* View Switching */}
            {view === 'month' && (
                <>
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-bold text-white w-48">{format(currentDate, 'MMMM yyyy')}</h3>
                            <div className="flex items-center gap-1">
                                <button onClick={prevMonth} aria-label="Previous Month" className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                                <button onClick={jumpToToday} className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 rounded-lg">Today</button>
                                <button onClick={nextMonth} aria-label="Next Month" className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative min-h-[500px] bg-gray-900 border border-white/10 rounded-xl h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">{day}</div>)}
                        </div>
                        <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6 divide-x divide-y divide-white/10">
                            {days.map((day) => {
                                const dayEvents = getEventsForDay(day);
                                return (
                                    <div key={day.toString()} className={`relative p-2 flex flex-col gap-1 min-h-[80px] ${!isSameMonth(day, currentDate) ? 'bg-black/20' : ''}`}>
                                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-blue-600 text-white' : !isSameMonth(day, currentDate) ? 'text-gray-600' : 'text-gray-300'}`}>{format(day, 'd')}</span>
                                        <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                            {dayEvents.map(event => (
                                                <div key={event.id} onClick={(e) => { e.stopPropagation(); openEventDetails(event); }} className={`px-1.5 py-0.5 rounded text-[10px] truncate border cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${TYPE_COLORS[event.type]}`}>
                                                    {event.title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {view === 'board' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                    <KanbanColumn title="Overdue" events={overdue} type="overdue" onEventClick={openEventDetails} onToggleComplete={handleToggleComplete} />
                    <KanbanColumn title="Today" events={todayList} type="today" onEventClick={openEventDetails} onToggleComplete={handleToggleComplete} />
                    <KanbanColumn title="Upcoming" events={upcoming} type="upcoming" onEventClick={openEventDetails} onToggleComplete={handleToggleComplete} />
                </div>
            )}

            {view === 'list' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900 border border-white/10 rounded-xl">
                    {filteredEvents.sort((a, b) => new Date(a.start) - new Date(b.start)).map(event => (
                        <div key={event.id} onClick={() => openEventDetails(event)} className={`cursor-pointer p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-between group ${event.status === 'completed' ? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={(e) => handleToggleComplete(event, e)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all w-32 justify-center ${event.status === 'completed' ? 'bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                                >
                                    {event.status === 'completed' ? (
                                        <>
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Completed
                                        </>
                                    ) : (
                                        <>
                                            <Circle className="w-3.5 h-3.5" />
                                            Mark Complete
                                        </>
                                    )}
                                </button>
                                <div className={`p-3 rounded-lg ${TYPE_COLORS[event.type]?.split(' ')[1]}`}>
                                    {React.createElement(TYPE_ICONS[event.type] || Circle, { className: `w-5 h-5 ${TYPE_COLORS[event.type]?.split(' ')[0]}` })}
                                </div>
                                <div>
                                    <h4 className={`text-white font-medium ${event.status === 'completed' ? 'line-through text-gray-500' : ''}`}>{event.title}</h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(event.start), 'MMM d, h:mm a')}</span>
                                        <span>•</span>
                                        <span>{event.lead_name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredEvents.length === 0 && <div className="text-center text-gray-500 py-10">No events found.</div>}
                </div>
            )}

            {/* Smart Plan Modal */}
            <AnimatePresence>
                {isSmartPlanOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsSmartPlanOpen(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-900/20 to-blue-900/20 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /> AI Smart Plan</h3>
                                    <p className="text-sm text-gray-400">AI-suggested actions for your highest priority leads.</p>
                                </div>
                                <button onClick={() => setIsSmartPlanOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1">
                                {loadingSuggestions ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                        <p className="text-gray-400">Analyzing leads and generating plan...</p>
                                    </div>
                                ) : suggestions.length > 0 ? (
                                    <div className="space-y-4">
                                        {suggestions.map((suggestion, idx) => (
                                            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-white">{suggestion.title}</h4>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${PRIORITY_COLORS[suggestion.priority]}`}>{suggestion.priority} Priority</span>
                                                    </div>
                                                    <p className="text-sm text-gray-300 mb-1">Lead: <span className="text-white font-medium">{suggestion.lead_name}</span></p>
                                                    <p className="text-xs text-purple-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Because: {suggestion.reason}</p>
                                                </div>
                                                <button onClick={() => acceptSuggestion(suggestion, idx)} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors" title="Add to Calendar">
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-500">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>You're all caught up! No immediate actions suggested.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reused Event Form Modal */}

            {/* ... Header and Views (unchanged) ... */}

            {/* Smart Plan Modal (unchanged) */}
            <AnimatePresence>
                {/* ... */}
            </AnimatePresence>

            {/* Reused Event Form Modal */}
            <EventFormModal
                isOpen={isCreateModalOpen || (selectedEvent && isEditMode)}
                onClose={() => { setIsCreateModalOpen(false); setIsEditMode(false); }}
                onSubmit={isEditMode ?
                    (data) => {
                        updateEvent(selectedEvent.id, {
                            ...data,
                            scheduled_at: new Date(data.scheduled_at).toISOString()
                        }).then(() => {
                            setIsEditMode(false);
                            setSelectedEvent(null);
                            loadData();
                        }).catch(() => alert("Failed to update"));
                    } :
                    (data) => {
                        createEvent({
                            ...data,
                            scheduled_at: new Date(data.scheduled_at).toISOString()
                        }).then(() => {
                            setIsCreateModalOpen(false);
                            loadData();
                        }).catch(() => alert("Failed to create"));
                    }
                }
                initialData={isEditMode ? {
                    lead_id: selectedEvent.lead_id,
                    title: selectedEvent.title,
                    type: selectedEvent.type,
                    status: selectedEvent.status, // Pass status
                    scheduled_at: new Date(new Date(selectedEvent.start).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                    notes: selectedEvent.notes
                } : null}
                leads={leads}
                isEditMode={isEditMode}
                title={isEditMode ? 'Edit Task' : 'Create Task'}
            />

            {/* View Details Modal (Reused) */}
            <AnimatePresence>
                {(selectedEvent && !isEditMode) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
                        <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5" /></button>
                            <h3 className="text-xl font-bold text-white mb-2">{selectedEvent.title}</h3>
                            <p className="text-gray-400 text-sm mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> {format(new Date(selectedEvent.start), 'PPp')}</p>
                            <div className="bg-white/5 p-4 rounded-lg mb-6">
                                <p className="text-xs text-gray-500 uppercase">Related Lead</p>
                                <p className="text-white">{selectedEvent.lead_name}</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsEditMode(true)} className="flex-1 py-2 bg-white/5 text-white rounded-lg">Edit</button>
                                <button onClick={handleDelete} className="flex-1 py-2 bg-red-500/10 text-red-400 rounded-lg">Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Success Modal */}
            <AnimatePresence>
                {showDeleteSuccess && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteSuccess(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Task Deleted</h3>
                            <p className="text-gray-400 mb-6">The task has been successfully removed from your calendar.</p>
                            <button
                                onClick={() => setShowDeleteSuccess(false)}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                            >
                                OK
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

const KanbanColumn = ({ title, events, type, onEventClick, onToggleComplete }) => (
    <div className="flex flex-col h-full bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className={`p-4 border-b border-white/10 font-bold ${type === 'overdue' ? 'text-red-400' : type === 'today' ? 'text-blue-400' : 'text-gray-400'}`}>
            {title} ({events.length})
        </div>
        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
            {events.map(event => (
                <div key={event.id} onClick={() => onEventClick(event)} className={`bg-gray-900 border border-white/10 p-4 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors shadow-sm group ${event.status === 'completed' ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider ${TYPE_COLORS[event.type]}`}>{event.type}</span>
                        {/* Checkbox Button -> Text Button */}
                        <button
                            onClick={(e) => onToggleComplete(event, e)}
                            className={`px-2 py-1 rounded text-[10px] font-medium border flex items-center gap-1 transition-all ${event.status === 'completed' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                        >
                            {event.status === 'completed' ? <Check className="w-3 h-3" /> : null}
                            {event.status === 'completed' ? 'Done' : 'Complete'}
                        </button>
                    </div>
                    <h4 className={`text-white font-medium text-sm mb-1 line-clamp-2 ${event.status === 'completed' ? 'line-through text-gray-500' : ''}`}>{event.title}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> {event.lead_name}</p>
                    <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.start), 'MMM d, h:mm a')}
                        {type === 'overdue' && <AlertCircle className="w-3 h-3 text-red-500 ml-auto" />}
                    </p>
                </div>
            ))}
        </div>
    </div>
);
