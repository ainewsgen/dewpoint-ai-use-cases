import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, AlertTriangle, CheckCircle, Loader2, Merge, Trash2 } from 'lucide-react';

export default function DeduplicationModal({ isOpen, onClose }) {
    const [step, setStep] = useState('scanning'); // 'scanning', 'results', 'complete'
    const [duplicates, setDuplicates] = useState([]);
    const [scanningProgress, setScanningProgress] = useState(0);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep('scanning');
            setScanningProgress(0);
            setDuplicates([]);

            // Simulate scanning
            const interval = setInterval(() => {
                setScanningProgress(prev => {
                    const next = prev + 10;
                    if (next >= 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            setStep('results');
                            // Mock Results
                            setDuplicates([
                                {
                                    id: 1,
                                    name: "John Doe",
                                    company: "Acme Corp",
                                    matches: [
                                        { id: 101, source: "Manual", email: "john@acme.com", created: "2 days ago" },
                                        { id: 102, source: "LinkedIn", email: "j.doe@acme.com", created: "1 hour ago" }
                                    ]
                                }
                            ]);
                        }, 500);
                        return 100;
                    }
                    return next;
                });
            }, 200);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    const handleResolve = (action) => {
        // action: 'merge' or 'keep_newest'
        setStep('complete');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-900">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-400" />
                            Deduplication Scan
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">Identify and merge duplicate lead records.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 overflow-y-auto">
                    {step === 'scanning' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                            <div className="relative w-24 h-24">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" className="stroke-white/10 fill-none" strokeWidth="8" />
                                    <motion.circle
                                        cx="48" cy="48" r="40"
                                        className="stroke-blue-500 fill-none"
                                        strokeWidth="8"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={251.2 - (251.2 * scanningProgress) / 100}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
                                    {scanningProgress}%
                                </div>
                            </div>
                            <p className="text-gray-400 animate-pulse">Scanning database for potential matches...</p>
                        </div>
                    )}

                    {step === 'results' && (
                        <div className="space-y-6">
                            {duplicates.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-white">Potential Duplicates Found</h4>
                                            <p className="text-sm text-gray-400 mt-1">We found {duplicates.length} sets of duplicate records. Review and resolve them below.</p>
                                        </div>
                                    </div>

                                    {duplicates.map((group) => (
                                        <div key={group.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                                                <div className="font-medium text-white">{group.name} <span className="text-gray-500">at</span> {group.company}</div>
                                                <div className="text-xs text-red-400 font-medium">2 Records Found</div>
                                            </div>
                                            <div className="divide-y divide-white/5">
                                                {group.matches.map(match => (
                                                    <div key={match.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                                                        <div>
                                                            <div className="text-sm text-gray-300">{match.email}</div>
                                                            <div className="text-xs text-gray-500 mt-1">Source: {match.source} • Created {match.created}</div>
                                                        </div>
                                                        <div className="text-xs px-2 py-1 rounded bg-white/10 text-gray-400">Match 95%</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-4 bg-black/20 flex justify-end gap-3 border-t border-white/10">
                                                <button
                                                    onClick={() => handleResolve('merge')}
                                                    className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    <Merge className="w-3.5 h-3.5 mr-1.5" />
                                                    Merge Records
                                                </button>
                                                <button
                                                    onClick={() => handleResolve('delete')}
                                                    className="flex items-center px-3 py-1.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                                    Keep Newest Only
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-xl font-bold text-white">No Duplicates Found</h3>
                                    <p className="text-gray-400 mt-2">Your lead database is clean and organized.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                                <CheckCircle className="w-10 h-10 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">Cleanup Complete</h3>
                                <p className="text-gray-400 mt-2 max-w-sm mx-auto">Successfully merged duplicate records. Your database is now optimized.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
