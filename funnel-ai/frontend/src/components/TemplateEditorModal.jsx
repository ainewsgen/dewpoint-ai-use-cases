import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const VARIABLES = [
    { label: 'First Name', value: '{{first_name}}' },
    { label: 'Last Name', value: '{{last_name}}' },
    { label: 'Company', value: '{{company}}' },
    { label: 'Title', value: '{{title}}' },
    { label: 'My Name', value: '{{sender_name}}' },
    { label: 'My Company', value: '{{sender_company}}' },
];

export default function TemplateEditorModal({ isOpen, initialData, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'email',
        subject: '',
        body: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({ name: '', type: 'email', subject: '', body: '' });
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = initialData ? `/api/templates/${initialData.id}` : '/api/templates/';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                onSave(data);
            } else {
                alert("Failed to save template");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const insertVariable = (variable) => {
        // Simple append for now, ideally insertion at cursor
        setFormData(prev => ({ ...prev, body: prev.body + ' ' + variable }));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-gray-900/50 backdrop-blur">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {initialData ? 'Edit Template' : 'New Template'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="template-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Template Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g., Intro Sequence #1"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Channel</label>
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="email">Email</option>
                                    <option value="sms">SMS / Text</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="linkedin">LinkedIn DM</option>
                                </select>
                            </div>
                        </div>

                        {formData.type === 'email' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Subject Line</label>
                                <input
                                    type="text"
                                    placeholder="Quick question regarding {{company}}..."
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="relative">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Message Body</label>

                            {/* Variable Picker */}
                            <div className="mb-2 flex flex-wrap gap-2">
                                {VARIABLES.map((v) => (
                                    <button
                                        key={v.value}
                                        type="button"
                                        onClick={() => insertVariable(v.value)}
                                        className="text-[10px] px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded transition-colors"
                                    >
                                        + {v.label}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                required
                                rows={8}
                                placeholder="Hi {{first_name}}, I noticed you work at {{company}}..."
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                                value={formData.body}
                                onChange={e => setFormData({ ...formData, body: e.target.value })}
                            />
                            <div className="absolute right-2 bottom-2 text-[10px] text-gray-500">
                                {formData.body.length} characters
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 bg-gray-900/50 backdrop-blur flex items-center justify-between">
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        AI content may be inaccurate.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button
                            type="submit"
                            form="template-form"
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Template</>}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
