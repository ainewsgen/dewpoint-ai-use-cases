import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, FileEdit, MoveRight, CheckCircle2 } from 'lucide-react';

const CRMActionModal = ({ isOpen, onClose, lead, type, onSubmit }) => {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({}); // Reset on open
        }
    }, [isOpen, type]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSubmit(type, formData);
            onClose();
        } catch (error) {
            console.error("Action failed", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderContent = () => {
        switch (type) {
            case 'pipeline':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Deal Title</label>
                            <input
                                type="text"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                placeholder={`Deal for ${lead.company || lead.last_name}`}
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Select Stage</label>
                            <select
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                value={formData.stage_id || ''}
                                onChange={e => setFormData({ ...formData, stage_id: e.target.value })}
                            >
                                <option value="">Select a stage...</option>
                                <option value="1">Discovery</option>
                                <option value="2">Proposal</option>
                                <option value="3">Negotiation</option>
                                <option value="4">Closed Won</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Estimated Value ($)</label>
                            <input
                                type="number"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                placeholder="0.00"
                                value={formData.value || ''}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                            />
                        </div>
                    </div>
                );
            case 'followup':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Date & Time</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 [color-scheme:dark] cursor-pointer"
                                value={formData.scheduled_at || ''}
                                onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                            <textarea
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 min-h-[100px]"
                                placeholder="What to discuss..."
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                );
            case 'note':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Note Content</label>
                            <textarea
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 min-h-[150px]"
                                placeholder="Enter note details..."
                                value={formData.content || ''}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'pipeline': return 'Add to Pipeline';
            case 'followup': return 'Schedule Follow-up';
            case 'note': return 'Add Note';
            default: return 'Action';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'pipeline': return <MoveRight className="w-5 h-5 text-purple-400" />;
            case 'followup': return <Calendar className="w-5 h-5 text-orange-400" />;
            case 'note': return <FileEdit className="w-5 h-5 text-yellow-400" />;
            default: return null;
        }
    };

    const getColor = () => {
        switch (type) {
            case 'pipeline': return 'bg-purple-600 hover:bg-purple-500';
            case 'followup': return 'bg-orange-600 hover:bg-orange-500';
            case 'note': return 'bg-yellow-600 hover:bg-yellow-500';
            default: return 'bg-blue-600 hover:bg-blue-500';
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white/5`}>
                            {getIcon()}
                        </div>
                        <h3 className="text-lg font-bold text-white">{getTitle()}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {renderContent()}
                </div>

                <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${getColor()} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Saving...' : 'Confirm Action'}
                        {!loading && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CRMActionModal;
