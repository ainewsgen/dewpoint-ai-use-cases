import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, RefreshCw, Copy, AlertCircle } from 'lucide-react';

const TONES = [
    { id: 'professional', label: 'Professional' },
    { id: 'casual', label: 'Casual' },
    { id: 'urgent', label: 'Urgent' }
];

export default function OutreachModal({ isOpen, onClose, lead, type, onSend }) {
    const [tone, setTone] = useState('professional');
    const [draft, setDraft] = useState({ subject: '', body: '' });
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);

    // Fetch templates on open
    useEffect(() => {
        if (isOpen && type) {
            fetch(`/api/templates/?type=${type}`)
                .then(res => res.json())
                .then(data => setTemplates(data))
                .catch(err => console.error("Failed to load templates", err));
        }
    }, [isOpen, type]);

    // Generate draft when modal opens
    useEffect(() => {
        if (isOpen && lead) {
            generateDraft();
        }
    }, [isOpen, lead, type, tone]);

    const replaceVariables = (text) => {
        if (!text) return '';
        let content = text;
        content = content.replace(/{{first_name}}/g, lead.first_name || '');
        content = content.replace(/{{last_name}}/g, lead.last_name || '');
        content = content.replace(/{{company}}/g, lead.company || '');
        content = content.replace(/{{title}}/g, lead.title || '');
        // Default fallbacks for sender
        content = content.replace(/{{sender_name}}/g, 'Me');
        content = content.replace(/{{sender_company}}/g, 'My Company');
        return content;
    };

    const applyTemplate = (template) => {
        setDraft({
            subject: replaceVariables(template.subject),
            body: replaceVariables(template.body)
        });
    };

    const generateDraft = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,
                    type: type,
                    tone: tone
                })
            });
            const data = await response.json();
            setDraft(data);
        } catch (error) {
            console.error("Failed to generate draft", error);
            setDraft({ body: "Error generating draft. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const handleSend = () => {
        onSend(type, draft);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Sparkles className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Draft {type === 'linkedin' ? 'LinkedIn Message' : type === 'sms' ? 'SMS' : 'Email'}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    To: <span className="text-white font-medium">{lead?.first_name} {lead?.last_name}</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {/* Controls */}
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                                {TONES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTone(t.id)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tone === t.id
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Templates Dropdown */}
                                <select
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                                    onChange={(e) => {
                                        const t = templates.find(t => t.id === parseInt(e.target.value));
                                        if (t) applyTemplate(t);
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Load Template...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>

                                <button
                                    onClick={generateDraft}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    Regenerate
                                </button>
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="space-y-4">
                            {type === 'email' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Subject</label>
                                    <input
                                        type="text"
                                        value={draft.subject || ''}
                                        onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                        placeholder="Subject line..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Message Body</label>
                                <textarea
                                    value={draft.body || ''}
                                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                                    className="w-full h-64 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none leading-relaxed"
                                    placeholder="AI is generating your draft..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 bg-white/5 flex items-center justify-between">
                        <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                            <Copy className="w-4 h-4" />
                            Copy to Clipboard
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Send className="w-4 h-4" />
                                Send Message
                            </button>
                        </div>
                    </div>
                    <p className="w-full text-center pb-2 text-[10px] text-gray-500 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        AI-generated content can be inaccurate. Please review before sending.
                    </p>
                </motion.div>
            </div >
        </AnimatePresence >
    );
}
