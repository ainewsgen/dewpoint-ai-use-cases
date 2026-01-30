import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Mail, Calendar, CheckSquare, MessageSquare } from 'lucide-react';

const TYPE_ICONS = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    task: CheckSquare,
    text: MessageSquare
};

export default function EventFormModal({ isOpen, onClose, onSubmit, initialData = {}, leads = [], isEditMode = false, title = "Create Task" }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scheduled_at: '',
        type: 'task',
        status: 'pending',
        lead_id: '',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            const data = initialData || {};
            setFormData({
                title: data.title || '',
                description: data.description || '',
                scheduled_at: data.scheduled_at || '',
                type: data.type || 'task',
                status: data.status || 'pending',
                lead_id: data.lead_id || (leads.length === 1 ? leads[0]?.id : '') || '',
                notes: data.notes || ''
            });
        }
    }, [isOpen, initialData, leads]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">{title}</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Follow up call"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Date & Time</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={formData.scheduled_at}
                                        onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    >
                                        {Object.keys(TYPE_ICONS).map(k => (
                                            <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Status Field - Only visible in Edit Mode */}
                            {isEditMode && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    >
                                        <option value="pending">Active</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            )}

                            {/* Only show Lead Select if multiple leads (or not pre-filtered) */}
                            {leads && leads.length > 1 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Related Lead</label>
                                    <select
                                        required
                                        value={formData.lead_id}
                                        onChange={e => setFormData({ ...formData, lead_id: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    >
                                        <option value="">Select Lead</option>
                                        {leads.filter(Boolean).map(l => (
                                            <option key={l.id} value={l.id}>{l.first_name || 'Unknown'} {l.last_name || ''} ({l.company || 'No Company'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                                <textarea
                                    placeholder="Add details..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    rows="3"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors font-medium">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20">{isEditMode ? 'Save Changes' : 'Create Task'}</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
