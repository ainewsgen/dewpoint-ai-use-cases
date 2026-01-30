import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Send,
    FileText,
    BarChart3,
    Settings,
    Zap,
    Calendar,
    Lock,
    Blocks
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../config';


const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Leads & Discovery', href: '/leads', icon: Users, feature: 'lead_discovery' },
    { name: 'Calendar & Tasks', href: '/calendar', icon: Calendar },
    { name: 'Message Templates', href: '/templates', icon: FileText },
    { name: 'Outreach & Campaigns', href: '/outreach', icon: Send, feature: 'outreach' },
    { name: 'Pipeline', href: '/pipeline', icon: BarChart3 },
    { name: 'Proposals', href: '/proposals', icon: FileText, feature: 'proposals' },
    { name: 'Integrations', href: '/integrations', icon: Blocks, feature: 'integrations' }, // Updated icon to Blocks
    { name: 'Observability', href: '/observability', icon: Zap },
    { name: 'Settings', href: '/settings', icon: Settings },
];

import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
    const location = useLocation();
    const { user } = useAuth();
    const [features, setFeatures] = useState({});
    const [planName, setPlanName] = useState('');

    useEffect(() => {
        if (user) {
            updateFeatures(user);
        }
    }, [user]);

    const updateFeatures = async (userData) => {
        try {
            // Fallback for user plan tier if undefined
            let userTier = (userData.plan_tier || 'free').toLowerCase().trim();
            // Map 'free' to 'starter' as per business logic
            if (userTier === 'free') userTier = 'starter';

            // Fetch all available plans to get feature flags
            // Note: This could also be cached or provided by context to reduce API calls
            const plansRes = await fetch(`${API_BASE_URL}/api/plans/`);
            if (plansRes.ok) {
                const plans = await plansRes.json();

                // Match user plan to system plans (case-insensitive)
                const planDetails = plans.find(p => p.name.toLowerCase().trim() === userTier);

                if (planDetails) {
                    setFeatures(planDetails.features || {});
                    setPlanName(planDetails.name);
                } else {
                    setFeatures({});
                    setPlanName(userData.plan_tier || 'Unknown');
                }
            }
        } catch (e) {
            console.error("Failed to load plan features", e);
        }
    };
    return (
        <div className="flex flex-col w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl h-screen fixed left-0 top-0 z-50">
            <div className="p-6 flex items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                    $Funnel.ai
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navigation.map((item) => {
                    const isLocked = item.feature && !features[item.feature];
                    const isActive = location.pathname === item.href;

                    return (
                        <Link
                            key={item.name}
                            to={isLocked ? '#' : item.href}
                            onClick={(e) => isLocked && e.preventDefault()}
                            className={
                                cn(
                                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative',
                                    isActive && !isLocked
                                        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white',
                                    isLocked && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-400'
                                )
                            }
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.name}
                            {isLocked && <Lock className="ml-auto w-4 h-4 text-gray-500" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-white/5">
                    <p className="text-xs text-blue-200 font-medium mb-1">Current Plan</p>
                    <p className="text-sm text-white font-bold">{planName}</p>
                    <div className="w-full bg-black/40 h-1.5 mt-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-[75%] h-full rounded-full" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">750/1000 credits used</p>
                </div>
            </div>
        </div>
    );
}
