import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, CreditCard, Bell, Shield, Check, Loader2, Save, Sparkles, Upload, File, Trash2, Palette, BarChart, Target, Zap, TrendingUp, Globe, Monitor, Mail, MessageSquare, Download, Wallet, Banknote, ShieldCheck, Lock } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { fetchUser, updateUser, upgradePlan } from '../lib/api_user';
import { fetchBrandSettings, updateBrandSettings, uploadBrandDocument, deleteBrandDocument, extractBrandColors } from '../lib/api_brand';
import { recalculateLeads } from '../lib/api';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
    const { refreshUser } = useAuth();
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState(null);
    const [brand, setBrand] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
    const [saving, setSaving] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [toast, setToast] = useState(null);

    const [features, setFeatures] = useState({});

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
        if (!user) loadData(); // Only load if not loaded
    }, [searchParams]);

    // Fetch plan details to get features
    useEffect(() => {
        if (user) {
            fetchPlanFeatures();
        }
    }, [user]);

    const fetchPlanFeatures = async () => {
        try {
            // Fallback for user plan tier if undefined
            let userTier = (user.plan_tier || 'free').toLowerCase().trim();
            if (userTier === 'free') userTier = 'starter';

            const res = await fetch(`${API_BASE_URL}/api/plans/`);
            if (res.ok) {
                const plans = await res.json();
                const planDetails = plans.find(p => p.name.toLowerCase().trim() === userTier);
                if (planDetails) {
                    setFeatures(planDetails.features || {});
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadData = async () => {
        try {
            const [userData, brandData] = await Promise.all([fetchUser(), fetchBrandSettings()]);
            setUser(userData);
            setBrand(brandData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateUser(user);
            setToast({ message: 'Profile updated successfully', type: 'success' });
        } catch (err) {
            setToast({ message: 'Failed to save settings', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleBrandUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateBrandSettings(brand);
            // If we are in the scoring tab, recalculate leads
            if (activeTab === 'scoring') {
                await recalculateLeads();
            }
            setToast({ message: 'Brand settings saved', type: 'success' });
        } catch (err) {
            setToast({ message: 'Failed to save brand settings', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // State for billing modal
    const [billingModalOpen, setBillingModalOpen] = useState(false);
    const [targetPlan, setTargetPlan] = useState(null);
    const [billingAuthorized, setBillingAuthorized] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [paymentAuthorized, setPaymentAuthorized] = useState(false);

    // ... (rest of loadData)

    const tiers = ['free', 'pro', 'enterprise'];

    const normalizePlan = (p) => {
        if (!p) return 'free';
        const lower = p.toLowerCase();
        return lower === 'starter' ? 'free' : lower;
    };

    const getPlanIndex = (p) => tiers.indexOf(normalizePlan(p));

    const getUpgradeLabel = (current, target) => {
        const cIdx = getPlanIndex(current);
        const tIdx = getPlanIndex(target);
        if (cIdx === tIdx) return "Current Plan";
        return tIdx > cIdx ? "Upgrade" : "Downgrade";
    };

    const initiateUpgrade = (tier) => {
        setTargetPlan(tier);
        setBillingAuthorized(false);
        setBillingModalOpen(true);
    };

    const confirmUpgrade = async () => {
        if (!targetPlan || !billingAuthorized) return;

        const label = getUpgradeLabel(user.plan_tier, targetPlan);
        const authorizedText = `I authorize Funnel.ai to change my subscription to the ${targetPlan} plan.`;

        try {
            setSaving(true);
            await upgradePlan(targetPlan, new Date().toISOString());
            setBillingModalOpen(false);
            loadData();
            refreshUser(); // Update global context for sidebar gating
            setToast({ message: `Successfully ${label.toLowerCase()}d to ${targetPlan}`, type: 'success' });
        } catch (err) {
            setToast({ message: 'Failed to update plan', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Billing Auth Modal Component
    const BillingAuthModal = () => {
        if (!billingModalOpen || !targetPlan) return null;

        const label = getUpgradeLabel(user.plan_tier, targetPlan);
        const price = targetPlan === 'free' ? '$0' : targetPlan === 'pro' ? '$49' : '$199';

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                >
                    <h3 className="text-xl font-bold text-white mb-2">Confirm Subscription Change</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        You are about to <span className="text-white font-bold">{label.toLowerCase()}</span> your workspace to the <span className="capitalize text-blue-400 font-bold">{targetPlan} Plan</span>.
                    </p>

                    <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-400">New Monthly Total</span>
                            <span className="text-xl font-bold text-white">{price}<span className="text-xs font-normal text-gray-500">/mo</span></span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Effective Date</span>
                            <span className="text-sm text-white">{new Date().toLocaleDateString()}</span>
                        </div>
                    </div>

                    <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors mb-6">
                        <input
                            type="checkbox"
                            checked={billingAuthorized}
                            onChange={(e) => setBillingAuthorized(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                        />
                        <span className="text-sm text-gray-300">
                            I authorize Funnel.ai to change my subscription to the {targetPlan} plan. This action is recorded for billing auditing purposes.
                        </span>
                    </label>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setBillingModalOpen(false)}
                            className="flex-1 py-2.5 bg-white/5 text-gray-300 font-medium rounded-lg hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmUpgrade}
                            disabled={!billingAuthorized || saving}
                            className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirm ${label}`}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    };

    // Auto-generate prompt based on sliders
    useEffect(() => {
        if (!brand) return;

        // Only auto-update if the user hasn't manually typed plenty, 
        // OR essentially we treat the sliders as the "source of truth" for the prompt structure.
        // For this feature request, "update as sliders move" implies direct control.
        const prompt = generateVoicePrompt(brand);
        setBrand(prev => ({ ...prev, brand_voice: prompt }));
    }, [
        brand?.tone_value,
        brand?.length_value,
        brand?.creativity_value,
        brand?.complexity_value,
        brand?.persuasiveness_value
    ]);

    const generateVoicePrompt = (b) => {
        const getAdj = (val, low, high, mid) => val < 35 ? low : val > 65 ? high : mid;

        const tone = getAdj(b.tone_value, "casual and friendly", "highly formal and professional", "balanced and professional");
        const length = getAdj(b.length_value, "concise and to-the-point", "comprehensive and detailed", "moderately detailed");
        const creativity = getAdj(b.creativity_value, "strictly factual and grounded", "imaginative and creative", "balanced and engaging");
        const complexity = getAdj(b.complexity_value, "simple, accessible language", "sophisticated, technical language", "standard industry terminology");
        const persuasive = getAdj(b.persuasiveness_value, "informational and objective", "highly persuasive and promotional", "compelling but objective");

        return `Write in a ${tone} style. Content should be ${length}, using ${complexity}. Maintain a ${creativity} approach that is ${persuasive}.`;
    };

    const handleExtractColors = async () => {
        if (!brand.website_url) return;
        setExtracting(true);
        try {
            const colors = await extractBrandColors(brand.website_url);
            if (colors && colors.length > 0) {
                // Take top 3 or pad with black
                const newColors = colors.slice(0, 3);
                while (newColors.length < 3) newColors.push('#000000');
                setBrand(prev => ({ ...prev, brand_colors: newColors }));
            } else {
                setToast({ message: 'No colors found on the provided URL.', type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: 'Failed to extract colors. Please check the URL.', type: 'error' });
        } finally {
            setExtracting(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            await uploadBrandDocument(file);
            loadData(); // Reload to get updated doc list
            setToast({ message: 'Document uploaded successfully', type: 'success' });
        } catch (err) {
            setToast({ message: 'Upload failed', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (filename) => {
        if (confirm('Delete this document?')) {
            try {
                await deleteBrandDocument(filename);
                loadData();
                setToast({ message: 'Document deleted', type: 'success' });
            } catch (err) {
                setToast({ message: 'Delete failed', type: 'error' });
            }
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;
    if (!user) return <div className="text-center p-12 text-red-400">Failed to load user data. Please refresh or try again later.</div>;

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
        { id: 'preferences', label: 'Preferences', icon: Bell },
        { id: 'brand', label: 'Branding & AI', icon: Sparkles },
        { id: 'scoring', label: 'Scoring & Signals', icon: Target },
    ];

    const currentColors = brand?.brand_colors || ['#ffffff', '#888888', '#000000'];

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>
            <BillingAuthModal />
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Account Settings</h2>
                <p className="text-gray-400 mt-1">Manage your personal information and subscription.</p>
            </div>

            <div className="flex gap-8">
                {/* Sidebar Tabs */}
                <div className="w-64 flex-shrink-0 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                                activeTab === tab.id
                                    ? "bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]"
                                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                            )}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                    <AnimatePresence mode="wait">
                        {activeTab === 'profile' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                key="profile"
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-bold text-white mb-6">Personal Information</h3>
                                <form onSubmit={handleUpdate} className="space-y-4 max-w-2xl">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                                            <input
                                                type="text" value={user.full_name} onChange={e => setUser({ ...user, full_name: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                            <input
                                                type="email" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                                        <input
                                            type="tel" value={user.phone || ''} onChange={e => setUser({ ...user, phone: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-white/10 mb-4">
                                        <h4 className="text-sm font-semibold text-gray-300 mb-3">Business Model</h4>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Business Type</label>
                                            <select
                                                value={user.business_type || 'b2b'}
                                                onChange={e => setUser({ ...user, business_type: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="b2b">B2B (Business to Business)</option>
                                                <option value="b2c">B2C (Business to Consumer)</option>
                                                <option value="hybrid">Hybrid (Both)</option>
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                This affects required fields for new leads (e.g., Company/Title are optional for B2C).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <h4 className="text-sm font-semibold text-gray-300 mb-3">Address</h4>
                                        <div className="space-y-3">
                                            <input
                                                type="text" value={user.address_line1 || ''} onChange={e => setUser({ ...user, address_line1: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                                placeholder="Street Address"
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <input
                                                    type="text" value={user.city || ''} onChange={e => setUser({ ...user, city: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                                    placeholder="City"
                                                />
                                                <input
                                                    type="text" value={user.state || ''} onChange={e => setUser({ ...user, state: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                                    placeholder="State / Province"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input
                                                    type="text" value={user.zip_code || ''} onChange={e => setUser({ ...user, zip_code: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                                    placeholder="Postal Code"
                                                />
                                                <input
                                                    type="text" value={user.country || ''} onChange={e => setUser({ ...user, country: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                                    placeholder="Country"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <button type="submit" disabled={saving} className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium disabled:opacity-50">
                                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {activeTab === 'billing' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                key="billing"
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-bold text-white mb-6">Plans & Billing</h3>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    {['free', 'pro', 'enterprise'].map(tier => (
                                        <div key={tier} className={cn(
                                            "p-6 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all hover:scale-105",
                                            normalizePlan(user.plan_tier) === tier
                                                ? "bg-blue-600/20 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                                                : "bg-black/20 border-white/10 hover:border-white/20"
                                        )}>
                                            <h4 className="text-lg font-bold text-white capitalize mb-1">{tier} Plan</h4>
                                            <div className="text-3xl font-bold text-white mb-4">
                                                {tier === 'free' ? '$0' : tier === 'pro' ? '$49' : '$199'}
                                                <span className="text-sm font-normal text-gray-400">/mo</span>
                                            </div>
                                            <ul className="text-sm text-gray-400 space-y-2 mb-6">
                                                <li>{tier === 'free' ? 'Basic CRM' : tier === 'pro' ? 'Advanced CRM + AI' : 'Unlimited AI & Support'}</li>
                                                <li>{tier === 'free' ? '50 Leads' : tier === 'pro' ? '5,000 Leads' : 'Unlimited Leads'}</li>
                                            </ul>
                                            {normalizePlan(user.plan_tier) === tier ? (
                                                <button disabled className="w-full py-2 bg-blue-500/20 text-blue-400 rounded-lg font-medium border border-blue-500/20">Current Plan</button>
                                            ) : (
                                                <button onClick={() => initiateUpgrade(tier)} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium">
                                                    {getUpgradeLabel(user.plan_tier, tier)}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Payment Methods Section */}
                                <div className="border-t border-white/10 pt-8">
                                    <h3 className="text-xl font-bold text-white mb-2">Payment Acceptance</h3>
                                    <p className="text-gray-400 text-sm mb-6">Manage how you pay for your Funnel.ai subscription.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                        {/* Credit Card Option */}
                                        <div
                                            onClick={() => setPaymentMethod('card')}
                                            className={cn(
                                                "p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group",
                                                paymentMethod === 'card'
                                                    ? "bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <CreditCard className={cn("w-6 h-6", paymentMethod === 'card' ? "text-blue-400" : "text-gray-400")} />
                                                {paymentMethod === 'card' && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                                            </div>
                                            <div className="font-bold text-white mb-1">Credit Card</div>
                                            <div className="flex gap-2 opacity-60">
                                                {/* Visa Logo SVG */}
                                                <svg className="h-4 w-auto" viewBox="0 0 36 11" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.986 10.596L14.773 0.605957H17.169L15.382 10.596H12.986ZM23.082 3.65596C23.09 3.73796 23.376 6.30796 23.376 6.30796L23.468 6.74196L24.168 3.65596H26.33L23.424 10.598H21.226L18.966 0.605957H21.436L23.082 3.65596ZM12.086 7.42996C12.112 7.62596 11.234 7.23596 11.234 7.23596C11.192 7.21396 9.43403 6.32196 6.84803 6.27996C4.94203 6.23796 4.70003 6.64196 4.67203 6.94196C4.60603 7.85996 9.17603 7.91596 9.17603 9.77196C9.17603 11.268 5.48003 11.082 4.41603 10.742C3.60603 10.482 3.32803 10.274 2.87203 10.052L2.50803 12.33C3.17003 12.602 4.63603 13.064 6.29003 13.098C9.52603 13.164 11.832 11.512 11.884 9.06996C11.91 8.35196 11.666 7.82596 11.234 7.41196C10.74 6.94396 9.70203 6.70396 8.37003 6.62196C7.03203 6.54196 6.64603 6.32396 6.66603 6.09796C6.69803 5.75396 7.55003 5.60396 8.44803 5.63796C9.13003 5.66396 10.668 5.86996 11.584 6.26596L12.086 7.42996ZM34.782 10.596L36 3.65596H33.824C33.344 3.65596 33.15 3.93196 32.966 4.29596L28.354 10.594H30.938L31.396 9.38996H34.298L34.568 10.594H34.782H34.782ZM32.062 7.73796L32.748 5.92796C32.748 5.92796 33.226 7.73796 33.242 7.73796H32.062ZM6.44803 3.65596L4.35203 9.42396C4.30603 9.61796 4.26603 9.65196 4.14803 9.65196C3.42803 9.68996 1.48003 9.01796 0.728027 8.65396L0.866027 8.01996C1.72603 7.20196 4.11603 3.65596 4.11603 3.65596H6.44803Z" fill="white" /></svg>
                                                {/* Mastercard Logo SVG */}
                                                <svg className="h-4 w-auto" viewBox="0 0 22 17" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.800049" y="0.800049" width="20.4" height="15.4" rx="1.2" fill="#1A1A1A" /><circle cx="7.80005" cy="8.5" r="5.5" fill="#EB001B" /><circle cx="14.2" cy="8.5" r="5.5" fill="#F79E1B" /><path d="M11 12.3889C9.71261 12.3889 8.5262 11.9444 7.57782 11.1972C6.62944 10.45 6.11116 9.5 6.11116 8.5C6.11116 7.5 6.62944 6.55 7.57782 5.80278C8.5262 5.05556 9.71261 4.61111 11 4.61111C12.2874 4.61111 13.4738 5.05556 14.4222 5.80278C15.3706 6.55 15.8889 7.5 15.8889 8.5C15.8889 9.5 15.3706 10.45 14.4222 11.1972C13.4738 11.9444 12.2874 12.3889 11 12.3889Z" fill="#F79E1B" /></svg>
                                            </div>
                                        </div>

                                        {/* PayPal Option */}
                                        <div
                                            onClick={() => setPaymentMethod('paypal')}
                                            className={cn(
                                                "p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden",
                                                paymentMethod === 'paypal'
                                                    ? "bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                {/* PayPal Logo SVG */}
                                                <svg className="h-6 w-auto" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.0501 20.3701L7.5401 17.2001H10.4501C14.7301 17.2001 16.7301 15.0801 17.3901 10.8701C17.6501 9.24009 17.3701 7.78009 16.5901 6.84009C15.6101 5.66009 13.9101 5.04009 11.6001 5.04009H5.0501L2.6101 20.3701H7.0501Z" fill={paymentMethod === 'paypal' ? '#3B82F6' : '#9CA3AF'} /></svg>
                                                {paymentMethod === 'paypal' && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                                            </div>
                                            <div className="font-bold text-white mb-1">PayPal</div>
                                            <div className="text-xs text-gray-500">Connect your account</div>
                                        </div>

                                        {/* Apple Pay Option */}
                                        <div
                                            onClick={() => setPaymentMethod('apple')}
                                            className={cn(
                                                "p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden",
                                                paymentMethod === 'apple'
                                                    ? "bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                {/* Apple Logo SVG */}
                                                <svg className="h-6 w-auto" viewBox="0 0 384 512" fill={paymentMethod === 'apple' ? 'white' : '#9CA3AF'} xmlns="http://www.w3.org/2000/svg"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" /></svg>
                                                {paymentMethod === 'apple' && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                                            </div>
                                            <div className="font-bold text-white mb-1">Apple Pay</div>
                                            <div className="text-xs text-gray-500">Fast checkout</div>
                                        </div>
                                    </div>

                                    {/* Credit Card Form - Only show if card is selected */}
                                    <AnimatePresence>
                                        {paymentMethod === 'card' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-black/20 border border-white/5 rounded-xl p-6 mb-6"
                                            >
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-medium text-white text-sm">Card Details</h4>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <ShieldCheck className="w-3 h-3 text-green-400" />
                                                        Secure 256-bit SSL Encrypted
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Card number"
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                                    />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input
                                                            type="text"
                                                            placeholder="MM / YY"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="CVC"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Legal & Compliance */}
                                    <div className="mb-6 bg-blue-900/10 border border-blue-500/10 rounded-lg p-4">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={paymentAuthorized}
                                                onChange={(e) => setPaymentAuthorized(e.target.checked)}
                                                className="mt-1 w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                                            />
                                            <div className="space-y-1">
                                                <span className="text-sm text-gray-200 font-medium">Authorization to Save & Charge</span>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    I authorize <span className="text-white">Funnel.ai Inc.</span> to securely store this payment method for future billing.
                                                    I understand that my subscription will automatically renew according to the plan terms.
                                                    Transactions differ by payment provider and may be subject to foreign transaction fees.
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <ShieldCheck className="w-4 h-4 text-gray-400" />
                                            <span>Payments processed securely by Stripe. PCI DSS Compliant.</span>
                                        </div>
                                        <button
                                            onClick={() => alert("Payment method updated (Test Mode)")}
                                            disabled={!paymentAuthorized}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/20"
                                        >
                                            Save Payment Method
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'preferences' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                key="preferences"
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-bold text-white mb-6">Notification Preferences</h3>
                                <form onSubmit={handleUpdate} className="space-y-4 max-w-lg">
                                    <div className="p-4 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between">
                                        <div>
                                            <div className="text-white font-medium">Email Notifications</div>
                                            <div className="text-sm text-gray-400">Receive weekly digests and lead alerts via email.</div>
                                        </div>
                                        <input
                                            type="checkbox" checked={user.email_opt_in} onChange={e => setUser({ ...user, email_opt_in: e.target.checked })}
                                            className="w-5 h-5 accent-blue-600 rounded bg-white/10 border-white/20"
                                        />
                                    </div>

                                    <div className="p-4 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between">
                                        <div>
                                            <div className="text-white font-medium">SMS Notifications</div>
                                            <div className="text-sm text-gray-400">Get text alerts for urgent pipeline changes.</div>
                                        </div>
                                        <input
                                            type="checkbox" checked={user.sms_opt_in} onChange={e => setUser({ ...user, sms_opt_in: e.target.checked })}
                                            className="w-5 h-5 accent-blue-600 rounded bg-white/10 border-white/20"
                                        />
                                    </div>

                                    <div className="p-4 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between">
                                        <div>
                                            <div className="text-white font-medium">E-Billing</div>
                                            <div className="text-sm text-gray-400">Receive invoices electronically.</div>
                                        </div>
                                        <input
                                            type="checkbox" checked={user.ebilling_opt_in} onChange={e => setUser({ ...user, ebilling_opt_in: e.target.checked })}
                                            className="w-5 h-5 accent-blue-600 rounded bg-white/10 border-white/20"
                                        />
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <button type="submit" disabled={saving} className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium disabled:opacity-50">
                                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Preferences
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {activeTab === 'brand' && brand && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                key="brand"
                                className="space-y-8"
                            >
                                <form onSubmit={handleBrandUpdate} className="space-y-8 max-w-2xl">
                                    {/* Brand Assets Section */}
                                    <div className="border-b border-white/10 pb-8">
                                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                            <Palette className="w-5 h-5 text-blue-400" />
                                            Brand Assets
                                        </h3>

                                        <div className="space-y-6">
                                            {/* Website Extraction */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">Website URL</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={brand.website_url || ''}
                                                        onChange={e => setBrand({ ...brand, website_url: e.target.value })}
                                                        placeholder="https://example.com"
                                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleExtractColors}
                                                        disabled={extracting || !brand.website_url}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg hover:bg-blue-600/30 disabled:opacity-50 transition-colors"
                                                    >
                                                        {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                        Fetch Colors
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Colors */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-3">Brand Palette</label>
                                                <div className="flex flex-wrap gap-6">
                                                    {currentColors.map((color, idx) => (
                                                        <div key={idx} className="space-y-2">
                                                            <div className="group relative">
                                                                <div
                                                                    className="w-20 h-20 rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-105"
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                                <input
                                                                    type="color"
                                                                    value={color}
                                                                    onChange={(e) => {
                                                                        const newColors = [...(brand.brand_colors || ['#ffffff', '#888888', '#000000'])];
                                                                        newColors[idx] = e.target.value;
                                                                        setBrand({ ...brand, brand_colors: newColors });
                                                                    }}
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={color}
                                                                onChange={(e) => {
                                                                    const newColors = [...(brand.brand_colors || ['#ffffff', '#888888', '#000000'])];
                                                                    newColors[idx] = e.target.value;
                                                                    setBrand({ ...brand, brand_colors: newColors });
                                                                }}
                                                                className="w-20 bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white text-center font-mono focus:border-blue-500 focus:outline-none"
                                                            />
                                                            <div className="text-[10px] text-gray-500 text-center uppercase tracking-wide">
                                                                {idx === 0 ? 'Primary' : idx === 1 ? 'Secondary' : 'Accent'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Campaign & Proposal Tuning</h3>
                                        <p className="text-gray-400 text-sm mb-6 flex justify-between items-center">
                                            <span>Fine-tune how the AI generates content for your brand.</span>
                                            {!features.ai_tuning && (
                                                <span className="flex items-center text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20">
                                                    <Lock className="w-3 h-3 mr-1" /> Requires Pro Plan
                                                </span>
                                            )}
                                        </p>

                                        {/* Sliders */}
                                        <div className={cn("grid gap-6 transition-opacity duration-300", !features.ai_tuning && "opacity-50 pointer-events-none select-none grayscale")}>
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-sm font-medium text-gray-300">Tone</label>
                                                    <span className="text-xs text-blue-400">{brand.tone_value < 30 ? 'Casual' : brand.tone_value > 70 ? 'Formal' : 'Balanced'}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100" value={brand.tone_value} onChange={e => setBrand({ ...brand, tone_value: parseInt(e.target.value) })}
                                                    disabled={!features.ai_tuning}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase">
                                                    <span>Casual</span>
                                                    <span>Formal</span>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-sm font-medium text-gray-300">Length</label>
                                                    <span className="text-xs text-blue-400">{brand.length_value < 30 ? 'Concise' : brand.length_value > 70 ? 'Detailed' : 'Standard'}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100" value={brand.length_value} onChange={e => setBrand({ ...brand, length_value: parseInt(e.target.value) })}
                                                    disabled={!features.ai_tuning}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase">
                                                    <span>Concise</span>
                                                    <span>Detailed</span>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-sm font-medium text-gray-300">Creativity</label>
                                                    <span className="text-xs text-blue-400">{brand.creativity_value < 30 ? 'Strict' : brand.creativity_value > 70 ? 'Creative' : 'Moderate'}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100" value={brand.creativity_value} onChange={e => setBrand({ ...brand, creativity_value: parseInt(e.target.value) })}
                                                    disabled={!features.ai_tuning}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase">
                                                    <span>Factual</span>
                                                    <span>Imaginative</span>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-sm font-medium text-gray-300">Complexity</label>
                                                    <span className="text-xs text-blue-400">{brand.complexity_value < 30 ? 'Simple' : brand.complexity_value > 70 ? 'Sophisticated' : 'Standard'}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100" value={brand.complexity_value || 50} onChange={e => setBrand({ ...brand, complexity_value: parseInt(e.target.value) })}
                                                    disabled={!features.ai_tuning}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase">
                                                    <span>Simple</span>
                                                    <span>Sophisticated</span>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-sm font-medium text-gray-300">Persuasiveness</label>
                                                    <span className="text-xs text-blue-400">{brand.persuasiveness_value < 30 ? 'Informational' : brand.persuasiveness_value > 70 ? 'Promotional' : 'Balanced'}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100" value={brand.persuasiveness_value || 50} onChange={e => setBrand({ ...brand, persuasiveness_value: parseInt(e.target.value) })}
                                                    disabled={!features.ai_tuning}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase">
                                                    <span>Informational</span>
                                                    <span>Promotional</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Brand Voice */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Brand Voice Description</label>
                                            <textarea
                                                className="w-full bg-black/20 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 h-24"
                                                placeholder="Describe your brand's personality (e.g. 'Professional but approachable, uses industry jargon, avoids slang')..."
                                                value={brand.brand_voice || ''}
                                                onChange={e => setBrand({ ...brand, brand_voice: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <button type="submit" disabled={saving} className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium disabled:opacity-50">
                                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                Save Brand Settings
                                            </button>
                                        </div>
                                    </div>
                                </form>

                                {/* Knowledge Base */}
                                <div className="pt-8 border-t border-white/10">
                                    <h3 className="text-lg font-bold text-white mb-4">Knowledge Base</h3>
                                    <p className="text-sm text-gray-400 mb-4">Upload past proposals, case studies, or style guides. The AI will use these as reference material.</p>

                                    <div className="grid gap-4">
                                        {brand.documents.map(doc => (
                                            <div key={doc.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                                        <File className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm text-gray-200">{doc.name}</span>
                                                </div>
                                                <button onClick={() => handleDeleteDoc(doc.name)} className="text-gray-500 hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-xl hover:bg-white/5 hover:border-blue-500/50 transition-all cursor-pointer group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                {uploading ? (
                                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                                ) : (
                                                    <Upload className="w-8 h-8 text-gray-500 group-hover:text-blue-500 mb-2 transition-colors" />
                                                )}
                                                <p className="text-sm text-gray-500 group-hover:text-gray-300">
                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-gray-600">PDF, DOCX, TXT up to 10MB</p>
                                            </div>
                                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'scoring' && brand && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                key="scoring"
                                className="space-y-8"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Signal Scoring Dynamics</h3>
                                    <p className="text-gray-400 text-sm mb-8">Define how potential leads are scored. Higher scores indicate higher purchase interest and ICP fit.</p>

                                    <form onSubmit={handleBrandUpdate} className="space-y-10 max-w-2xl">
                                        <div className="grid gap-8">
                                            {/* ICP Fit Weight */}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <label className="text-sm font-bold text-white flex items-center gap-2">
                                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                                            ICP Fit Weighting
                                                        </label>
                                                        <p className="text-xs text-gray-500 max-w-md">How much should company size, industry, and headquarters location impact the score?</p>
                                                    </div>
                                                    <span className="text-lg font-bold text-blue-400">{brand.weight_icp}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100" value={brand.weight_icp || 50} onChange={e => setBrand({ ...brand, weight_icp: parseInt(e.target.value) })}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                />
                                            </div>

                                            {/* Seniority Weight */}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <label className="text-sm font-bold text-white flex items-center gap-2">
                                                            <User className="w-4 h-4 text-purple-400" />
                                                            Decision Maker Weighting
                                                        </label>
                                                        <p className="text-xs text-gray-500 max-w-md">Prioritize job titles like CEO, VP, and Director. Higher weighting emphasizes budget authority.</p>
                                                    </div>
                                                    <span className="text-lg font-bold text-blue-400">{brand.weight_seniority}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100" value={brand.weight_seniority || 50} onChange={e => setBrand({ ...brand, weight_seniority: parseInt(e.target.value) })}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                />
                                            </div>

                                            {/* Intent Signals Expansion */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 pt-4">
                                                {/* Website Visits */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                                <Globe className="w-3.5 h-3.5 text-blue-400" />
                                                                Website Visits
                                                            </label>
                                                        </div>
                                                        <span className="text-sm font-bold text-blue-400">{brand.weight_intent_website}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="100" value={brand.weight_intent_website || 50} onChange={e => setBrand({ ...brand, weight_intent_website: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>

                                                {/* Pricing Page */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                                                                Pricing Page View
                                                            </label>
                                                        </div>
                                                        <span className="text-sm font-bold text-blue-400">{brand.weight_intent_pricing}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="100" value={brand.weight_intent_pricing || 50} onChange={e => setBrand({ ...brand, weight_intent_pricing: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>

                                                {/* Demo Request */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                                <Monitor className="w-3.5 h-3.5 text-red-400" />
                                                                Demo Request
                                                            </label>
                                                        </div>
                                                        <span className="text-sm font-bold text-blue-400">{brand.weight_intent_demo}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="100" value={brand.weight_intent_demo || 50} onChange={e => setBrand({ ...brand, weight_intent_demo: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>

                                                {/* Content Download */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                                <Download className="w-3.5 h-3.5 text-orange-400" />
                                                                Content Download
                                                            </label>
                                                        </div>
                                                        <span className="text-sm font-bold text-blue-400">{brand.weight_intent_content}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="100" value={brand.weight_intent_content || 50} onChange={e => setBrand({ ...brand, weight_intent_content: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>

                                                {/* Social Engagement */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                                                                Social Signal
                                                            </label>
                                                        </div>
                                                        <span className="text-sm font-bold text-blue-400">{brand.weight_intent_social}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="100" value={brand.weight_intent_social || 50} onChange={e => setBrand({ ...brand, weight_intent_social: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>

                                                {/* Email Clicks */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                                <Mail className="w-3.5 h-3.5 text-yellow-400" />
                                                                Email Interaction
                                                            </label>
                                                        </div>
                                                        <span className="text-sm font-bold text-blue-400">{brand.weight_intent_email}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="100" value={brand.weight_intent_email || 50} onChange={e => setBrand({ ...brand, weight_intent_email: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-2xl bg-blue-600/5 border border-blue-500/20 flex gap-4">
                                            <div className="p-2 bg-blue-500/20 rounded-lg h-fit">
                                                <BarChart className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white mb-1">Scoring Intelligence</h4>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    Your signal score is calculated by normalizing these factors and blending them with the current pipeline stage. Adjusting these weights will trigger a recalculation of all active leads in your discovery funnel.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button type="submit" disabled={saving} className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 transition-all">
                                                {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                                Save & Recalculate Scores
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
