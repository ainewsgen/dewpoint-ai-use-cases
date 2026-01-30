import React, { useEffect, useState } from 'react';
import { FileEdit, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const NotesList = ({ leadId }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!leadId) return;

        const fetchNotes = async () => {
            try {
                const res = await fetch(`/api/history/${leadId}`);
                if (res.ok) {
                    const data = await res.json();
                    setNotes(data.filter(item => item.type === 'note'));
                }
            } catch (err) {
                console.error("Failed to fetch notes", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();
        // Poll for updates every 5s? Or rely on parent refresh?
        // Let's keep it simple for now.
    }, [leadId]);

    if (loading) return <div className="text-gray-500 text-xs text-center py-4">Loading notes...</div>;
    if (notes.length === 0) return <div className="text-gray-500 text-xs text-center py-4">No notes yet.</div>;

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <FileEdit className="w-3 h-3" /> Notes
            </h4>
            <div className="space-y-3">
                {notes.map((note) => (
                    <motion.div
                        key={note.id + note.date}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/5 rounded-lg p-3"
                    >
                        <p className="text-sm text-gray-200 whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-500">
                            <Clock className="w-3 h-3" />
                            {new Date(note.date).toLocaleString(undefined, {
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                            })}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default NotesList;
