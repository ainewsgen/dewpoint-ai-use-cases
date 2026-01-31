import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Circle, Calendar, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function DealDetailsModal({ isOpen, onClose, deal }) {
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && deal) {
            fetchTasks();
        }
    }, [isOpen, deal]);

    const fetchTasks = async () => {
        try {
            const res = await fetch(`/api/tasks/${deal.id}`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTaskTitle,
                    deal_id: deal.id,
                    type: 'todo',
                    priority: 'medium'
                })
            });
            if (res.ok) {
                setNewTaskTitle('');
                fetchTasks();
            }
        } catch (err) {
            alert("Failed to add task");
        }
    };

    const toggleTask = async (task) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));

        try {
            await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: !task.is_completed })
            });
        } catch (err) {
            console.error("Failed to update task");
            fetchTasks(); // Revert
        }
    };

    const deleteTask = async (taskId) => {
        if (!confirm("Delete this task?")) return;
        try {
            await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            alert("Failed to delete task");
        }
    };

    if (!isOpen || !deal) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        if (deal) {
            setEditTitle(deal.title);
            setEditValue(deal.value);
        }
    }, [deal]);

    const handleSave = async () => {
        try {
            console.log("Saving deal update...", `/api/pipeline/deals/${deal.id}`);
            const res = await fetch(`/api/pipeline/deals/${deal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle,
                    value: parseFloat(editValue) || 0,
                    stage_id: deal.stage_id || deal.stage?.id || 6, // Fallback to Cold (6) if missing
                    lead_id: deal.lead_id || deal.lead?.id
                })
            });
            console.log("Save response status:", res.status);

            if (res.ok) {
                const data = await res.json();
                console.log("Save success:", data);
                setIsEditing(false);
                onClose();
                window.location.reload();
            } else {
                const txt = await res.text();
                console.error("Save failed:", txt);
                alert("Failed to save deal: " + txt);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            alert("Failed to save deal (Network Error)");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    if (!isOpen || !deal) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-start">
                        <div className="flex-1 mr-4">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xl font-bold text-white focus:outline-none focus:border-blue-500"
                                        autoFocus
                                    />
                                    <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-32 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                                        placeholder="Value"
                                    />
                                </div>
                            ) : (
                                <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-white/5 p-1 -ml-1 rounded transition-colors group">
                                    <h2 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{deal.title}</h2>
                                    <p className="text-sm text-green-400 font-medium mt-1">
                                        ${deal.value?.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            <p className="text-sm text-gray-400 mt-2">
                                {deal.lead?.company || 'No Company'} • {deal.lead?.first_name} {deal.lead?.last_name}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing && (
                                <button onClick={handleSave} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-xs font-medium">
                                    Save
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ... Rest of existing content ... */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                                Tasks & Next Steps
                            </h3>
                            <span className="text-xs text-gray-500">{tasks.filter(t => t.is_completed).length}/{tasks.length} Completed</span>
                        </div>

                        {/* Add Task Form */}
                        <form onSubmit={handleAddTask} className="mb-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="Add a new task..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                />
                                <button
                                    type="submit"
                                    disabled={!newTaskTitle.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>
                        </form>

                        {/* Task List */}
                        <div className="space-y-2">
                            {tasks.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-white/5 rounded-xl">
                                    No tasks yet. Add one to get started!
                                </div>
                            ) : (
                                tasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={cn(
                                            "group flex items-center gap-3 p-3 rounded-lg border transition-all",
                                            task.is_completed
                                                ? "bg-white/5 border-transparent opacity-60"
                                                : "bg-white/5 border-white/5 hover:border-blue-500/30"
                                        )}
                                    >
                                        <button
                                            onClick={() => toggleTask(task)}
                                            className={cn(
                                                "shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                                task.is_completed
                                                    ? "bg-green-500/20 border-green-500/50 text-green-400"
                                                    : "border-gray-500 text-transparent hover:border-blue-400"
                                            )}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-medium truncate transition-all",
                                                task.is_completed ? "text-gray-500 line-through" : "text-white"
                                            )}>
                                                {task.title}
                                            </p>
                                            {task.due_date && (
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
