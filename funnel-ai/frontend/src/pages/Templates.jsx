import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Edit2,
    Trash2,
    Mail,
    MessageSquare,
    Linkedin,
    Copy
} from 'lucide-react';
import TemplateEditorModal from '../components/TemplateEditorModal';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';

export default function Templates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, email, sms, linkedin, whatsapp
    const [search, setSearch] = useState('');
    const [editorConfig, setEditorConfig] = useState(null); // { isOpen: true, template: null (create) or obj }
    const [toast, setToast] = useState(null);

    const loadTemplates = async () => {
        try {
            const res = await fetch('/api/templates/');
            if (res.ok) {
                setTemplates(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTemplates(prev => prev.filter(t => t.id !== id));
                setToast({ message: "Template deleted", type: 'success' });
            }
        } catch (err) {
            setToast({ message: "Failed to delete", type: 'error' });
        }
    };

    const handleSave = async (templateData) => {
        // Optimistic update or refresh
        await loadTemplates();
        setEditorConfig(null);
        setToast({ message: templateData.id ? "Template updated" : "Template created", type: 'success' });
    };

    const filteredTemplates = templates.filter(t => {
        const matchesType = filter === 'all' || t.type === filter;
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.body.toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case 'email': return <Mail className="w-4 h-4 text-blue-400" />;
            case 'sms': return <MessageSquare className="w-4 h-4 text-green-400" />;
            case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-600" />;
            case 'linkedin': return <Linkedin className="w-4 h-4 text-blue-600" />;
            default: return <FileText className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Communication Templates</h2>
                    <p className="text-gray-400 mt-1">Create and manage standard messages for emails, texts, and social DMs.</p>
                </div>
                <button
                    onClick={() => setEditorConfig({ isOpen: true, template: null })}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Create Template
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10 w-fit">
                {['all', 'email', 'sms', 'linkedin', 'whatsapp'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                            filter === type ? "bg-white/10 text-white shadow" : "text-gray-400 hover:text-white"
                        )}
                    >
                        {type === 'sms' ? 'SMS/Text' : type}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => (
                    <motion.div
                        key={template.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-gray-900 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all hover:bg-white/5 flex flex-col h-64"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                    {getTypeIcon(template.type)}
                                </div>
                                <h3 className="font-bold text-white truncate">{template.name}</h3>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditorConfig({ isOpen: true, template })} aria-label="Edit Template" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(template.id)} aria-label="Delete Template" className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {template.subject && (
                            <div className="mb-2 text-sm text-gray-300 font-medium truncate">
                                <span className="text-gray-500 mr-2">Subject:</span> {template.subject}
                            </div>
                        )}

                        <div className="flex-grow overflow-hidden relative">
                            <p className="text-sm text-gray-400 whitespace-pre-wrap font-mono bg-black/20 p-3 rounded-lg border border-white/5 h-full text-xs">
                                {template.body}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {template.variables.length > 0 ? (
                                template.variables.map(v => (
                                    <span key={v} className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                                        {`{{${v}}}`}
                                    </span>
                                ))
                            ) : (
                                <span className="text-[10px] text-gray-600 italic">No variables</span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {editorConfig && (
                    <TemplateEditorModal
                        isOpen={editorConfig.isOpen}
                        initialData={editorConfig.template}
                        onClose={() => setEditorConfig(null)}
                        onSave={handleSave}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            </AnimatePresence>
        </div>
    );
}
