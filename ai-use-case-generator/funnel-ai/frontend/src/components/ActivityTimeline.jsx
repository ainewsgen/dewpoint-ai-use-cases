import React, { useEffect, useState } from 'react';
import { FileEdit, Calendar, Briefcase, Clock, Mail, MessageSquare, CheckCircle2, Phone, Users, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ActivityTimeline = ({ leadId, includeNotes = true }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!leadId) return;

        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/history/${leadId}`);
                if (res.ok) {
                    let data = await res.json();
                    if (!includeNotes) {
                        data = data.filter(item => item.type !== 'note');
                    }
                    setHistory(data);
                }
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [leadId]);

    const getIcon = (type) => {
        switch (type) {
            case 'note': return <FileEdit className="w-4 h-4 text-yellow-400" />;
            case 'followup': return <Calendar className="w-4 h-4 text-orange-400" />;
            case 'deal': return <Briefcase className="w-4 h-4 text-purple-400" />;
            case 'call': return <Phone className="w-4 h-4 text-purple-400" />;
            case 'meeting': return <Users className="w-4 h-4 text-blue-400" />;
            case 'task': return <CheckCircle className="w-4 h-4 text-green-400" />;
            default:
                if (type && type.includes('Email')) return <Mail className="w-4 h-4 text-blue-400" />;
                if (type && type.includes('SMS')) return <MessageSquare className="w-4 h-4 text-green-400" />;
                return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    if (loading) return <div className="text-gray-500 text-xs text-center py-4">Loading history...</div>;
    if (history.length === 0) return <div className="text-gray-500 text-xs text-center py-4">No activity yet.</div>;

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Activity Timeline</h4>
            <div className="relative border-l border-white/10 ml-2 space-y-6">
                {history.map((item) => (
                    <motion.div
                        key={item.id + item.type}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative pl-6"
                    >
                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-[#0A0A0A] border border-white/20 flex items-center justify-center">
                            {getIcon(item.type)}
                        </div>
                        <div className="text-sm text-gray-200">
                            <span className="font-medium text-white capitalize">{item.type === 'note' && item.content.includes('📧') ? 'Email' : item.type}:</span> {item.content}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                            {new Date(item.date).toLocaleString()}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ActivityTimeline;
