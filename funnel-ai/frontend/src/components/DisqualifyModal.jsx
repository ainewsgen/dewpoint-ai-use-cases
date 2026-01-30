import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

export default function DisqualifyModal({ isOpen, onClose, onConfirm, leadName }) {
    const [reason, setReason] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(reason);
        setReason(""); // Reset for next time
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-sm bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6"
                >
                    <div className="flex items-center gap-3 mb-4 text-red-400">
                        <AlertCircle className="w-6 h-6" />
                        <h3 className="text-lg font-bold">Disqualify Lead</h3>
                    </div>

                    <p className="text-gray-300 text-sm mb-4">
                        Are you sure you want to disqualify <span className="font-bold text-white">{leadName}</span>?
                        This will mark them as lost.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full h-24 bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-red-500/50 mb-4 resize-none"
                            placeholder="Reason for disqualification (e.g., Budget, Timing, Competitor)..."
                            autoFocus
                            required
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!reason.trim()}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                Disqualify
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
