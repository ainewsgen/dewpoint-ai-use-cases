import React, { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, Clock, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/notifications/');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    // Poll every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.length;

    const dismissNotification = async (e, id) => {
        e.stopPropagation();
        try {
            await fetch(`http://localhost:8000/api/notifications/${id}/dismiss`, { method: 'POST' });
            // Optimistic update
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Failed to dismiss", error);
        }
    };

    return (
        <div className="relative">
            {/* Bell Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-80 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                        >
                            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h3>
                                <div className="flex items-center gap-3">
                                    <div className="text-[10px] text-gray-400">{unreadCount} Pending</div>
                                    <a href="/settings?tab=preferences" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                        <SettingsIcon className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto">
                                {unreadCount === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-xs">
                                        No active alerts.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {notifications.map((note) => (
                                            <div key={note.id} className="p-3 hover:bg-white/5 transition-colors flex gap-3 group relative">
                                                <div className={`mt-1 ${note.type === 'overdue_task' ? 'text-red-500' : 'text-orange-500'}`}>
                                                    {note.type === 'overdue_task' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 pr-6">
                                                    <p className="text-sm text-gray-200">{note.message}</p>
                                                    <p className="text-[10px] text-gray-500 mt-1">
                                                        {new Date(note.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => dismissNotification(e, note.id)}
                                                    className="absolute top-3 right-3 text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
