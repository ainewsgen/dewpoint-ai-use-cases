import React, { useState, useEffect } from 'react';
import { Save, Check, X, Shield, Zap, Search, Database, Calendar as CalendarIcon, Send, FileText, Blocks, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

export default function AdminPlans() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // id of plan being saved
    const [showSuccess, setShowSuccess] = useState(false);

    // Define feature groups for organized display
    const FEATURE_GROUPS = [
        {
            title: "Lead Discovery",
            features: [
                { key: 'lead_discovery', label: 'Lead Discovery Access', icon: Search },
                { key: 'ai_enrichment', label: 'Get Leads (AI Enrichment)', icon: Database },
                { key: 'enrich_all', label: 'Bulk Enrichment', icon: Sparkles },
            ]
        },
        {
            title: "Outreach & Campaigns",
            features: [
                { key: 'outreach', label: 'Outreach Module', icon: Send },
            ]
        },
        {
            title: "Calendar & Tasks",
            features: [
                { key: 'smart_plan', label: 'Smart Plan & Tasks', icon: CalendarIcon },
            ]
        },
        {
            title: "Proposals",
            features: [
                { key: 'proposals', label: 'Proposals Access', icon: FileText },
            ]
        },
        {
            title: "Integrations & Data",
            features: [
                { key: 'integrations', label: 'Integration Store Access', icon: Blocks },
                { key: 'crm_sync', label: 'CRM Synchronization', icon: Zap },
            ]
        },
        {
            title: "System & Support",
            features: [
                { key: 'priority_support', label: 'Priority Support', icon: Shield },
            ]
        }
    ];

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/plans/`);
            if (res.ok) {
                const data = await res.json();
                // Sort by price if array, else empty
                if (Array.isArray(data)) {
                    setPlans(data.sort((a, b) => a.price - b.price));
                } else {
                    console.error("Received invalid plans data:", data);
                    setPlans([]);
                }
            } else {
                console.error("Failed to fetch plans:", res.status);
            }
        } catch (err) {
            console.error("Failed to fetch plans", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (plan) => {
        setSaving(plan.id);
        try {
            await fetch(`${API_BASE_URL}/api/plans/${plan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    price: parseFloat(plan.price),
                    weekly_limit: parseInt(plan.weekly_limit),
                    features: plan.features
                })
            });
            // Show quick success state if needed, or just remove loading
            setShowSuccess(true);
            window.dispatchEvent(new Event('plan-updated'));
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            alert('Failed to save plan');
        } finally {
            setSaving(null);
        }
    };

    const toggleFeature = (planIndex, featureKey) => {
        const newPlans = [...plans];
        const plan = newPlans[planIndex];

        // Toggle boolean
        const current = plan.features?.[featureKey];
        plan.features = {
            ...(plan.features || {}),
            [featureKey]: !current
        };

        setPlans(newPlans);
    };

    const updatePrice = (planIndex, value) => {
        const newPlans = [...plans];
        newPlans[planIndex].price = value;
        setPlans(newPlans);
    };

    const updateLimit = (planIndex, value) => {
        const newPlans = [...plans];
        newPlans[planIndex].weekly_limit = value;
        setPlans(newPlans);
    };

    if (loading) return <div className="p-8 text-white">Loading configuration...</div>;

    return (
        <div className="h-full overflow-y-auto pb-10">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white tracking-tight">Plan Configuration</h2>
                <p className="text-gray-400 mt-1">Manage pricing tiers and feature gating.</p>
            </div>

            {plans.length === 0 && (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-gray-400">No plans available.</p>
                    <p className="text-sm text-red-400 mt-2">Please check if the backend is running.</p>
                    <button
                        onClick={fetchPlans}
                        className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan, idx) => (
                    <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col backdrop-blur-sm"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                <p className="text-xs text-gray-400">{plan.description}</p>
                            </div>
                            {plan.name === 'Enterprise' && (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded">
                                    Top Tier
                                </span>
                            )}
                        </div>

                        {/* Price Input */}
                        <div className="mb-8 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Price</label>
                                <div className="relative mt-2">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        value={plan.price}
                                        onChange={(e) => updatePrice(idx, e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-8 pr-4 text-2xl font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Limit</label>
                                <div className="relative mt-2">
                                    <input
                                        type="number"
                                        value={plan.weekly_limit}
                                        onChange={(e) => updateLimit(idx, e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-2xl font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">LEADS</span>
                                </div>
                            </div>
                        </div>

                        {/* Features List Grouped */}
                        <div className="flex-1 space-y-6 mb-8">
                            {FEATURE_GROUPS.map((group) => (
                                <div key={group.title} className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1 mb-2">
                                        {group.title}
                                    </h4>
                                    {group.features.map(feat => {
                                        const isEnabled = plan.features?.[feat.key];
                                        const Icon = feat.icon;

                                        return (
                                            <div
                                                key={feat.key}
                                                onClick={() => toggleFeature(idx, feat.key)}
                                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isEnabled
                                                    ? 'bg-blue-500/10 border-blue-500/30'
                                                    : 'bg-white/5 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded ${isEnabled ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                        <Icon className="w-3 h-3" />
                                                    </div>
                                                    <span className={`text-sm ${isEnabled ? 'text-white font-medium' : 'text-gray-400'}`}>
                                                        {feat.label}
                                                    </span>
                                                </div>
                                                <div className={`w-10 h-6 rounded-full relative transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isEnabled ? 'left-5' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleUpdate(plan)}
                            disabled={saving === plan.id}
                            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex justify-center items-center gap-2"
                        >
                            {saving === plan.id ? (
                                <span className="animate-spin block w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Save Changes
                                </>
                            )}
                        </button>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 font-medium"
                    >
                        <Check className="w-5 h-5 bg-white text-green-500 rounded-full p-0.5" />
                        Plan options saved successfully
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
