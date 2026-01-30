import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

const LeadFormModal = ({ isOpen, onClose, onSubmit, initialData = null, businessType = 'b2b' }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        secondary_email: '',
        secondary_phone: '',
        company: '',
        title: '',
        location: '',
        linkedin_url: '',
        source: 'manual',
        ...initialData
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        } else {
            // Reset for Add Mode
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                secondary_email: '',
                secondary_phone: '',
                company: '',
                title: '',
                location: '',
                linkedin_url: '',
                source: 'manual'
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error("Form submission failed", error);
            // Optionally set error state here if parent doesn't handle alert
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">
                        {initialData ? 'Edit Lead' : 'Add New Prospect'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">First Name</label>
                            <input
                                required
                                type="text"
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Jane"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Last Name</label>
                            <input
                                required
                                type="text"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Smith"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Email Address</label>
                        <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="jane.smith@company.com"
                        />
                        <p className="text-[10px] text-gray-500 mt-1 italic">Expected format: name@domain.com</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="+1 (555) 123-4567"
                        />
                        <p className="text-[10px] text-gray-500 mt-1 italic">Optional: Include country code</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Secondary Email</label>
                            <input
                                type="email"
                                value={formData.secondary_email || ''}
                                onChange={e => setFormData({ ...formData, secondary_email: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="alternate@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Secondary Phone</label>
                            <input
                                type="tel"
                                value={formData.secondary_phone || ''}
                                onChange={e => setFormData({ ...formData, secondary_phone: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Secondary Phone"
                            />
                        </div>
                    </div>
                    {businessType !== 'b2c' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                                    Company {businessType === 'hybrid' && <span className="text-gray-500 normal-case">(Optional)</span>}
                                </label>
                                <input
                                    required={businessType === 'b2b'}
                                    type="text"
                                    value={formData.company || ''}
                                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder={businessType === 'hybrid' ? "Acme Corp (Optional)" : "Acme Corp"}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                                    Job Title {businessType === 'hybrid' && <span className="text-gray-500 normal-case">(Optional)</span>}
                                </label>
                                <input
                                    required={businessType === 'b2b'}
                                    type="text"
                                    value={formData.title || ''}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder={businessType === 'hybrid' ? "VP Marketing (Optional)" : "VP Marketing"}
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">LinkedIn URL</label>
                        <input
                            type="url"
                            value={formData.linkedin_url || ''}
                            onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="https://linkedin.com/in/janesmith"
                        />
                        <p className="text-[10px] text-gray-500 mt-1 italic">Expected: linkedin.com/in/username</p>
                    </div>
                    {/* Location Field - Was missing in add modal but useful */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Location</label>
                        <input
                            type="text"
                            value={formData.location || ''}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="San Francisco, CA"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium disabled:opacity-50 transition-all"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (initialData ? "Save Changes" : "Verify & Add Prospect")}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default LeadFormModal;
