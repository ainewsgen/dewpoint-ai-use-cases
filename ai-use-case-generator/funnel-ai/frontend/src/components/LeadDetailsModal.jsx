import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock } from 'lucide-react';
import ActivityTimeline from './ActivityTimeline';
import NotesList from './NotesList';

const LeadDetailsModal = ({ isOpen, onClose, lead }) => {
    if (!isOpen || !lead) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{lead.first_name} {lead.last_name}</h3>
                            <p className="text-xs text-gray-400">{lead.company} • {lead.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Lead Information</h4>
                                <div className="space-y-3">
                                    <InfoRow label="Email" value={lead.email} />
                                    <InfoRow label="Phone" value={lead.phone || 'N/A'} />
                                    <InfoRow label="Location" value={lead.location || 'N/A'} />
                                    <InfoRow label="Industry" value={lead.industry || 'N/A'} />
                                    <InfoRow label="Source" value={lead.source} />
                                    <InfoRow label="Score" value={lead.score} />
                                </div>
                            </div>

                            <div className="mt-8 border-t border-white/10 pt-6">
                                <NotesList leadId={lead.id} />
                            </div>
                        </div>

                        <div>
                            <ActivityTimeline leadId={lead.id} includeNotes={false} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm text-gray-200 font-medium">{value}</span>
    </div>
);

export default LeadDetailsModal;
