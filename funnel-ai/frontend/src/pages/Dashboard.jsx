import React, { useState, useEffect } from 'react';

export default function Dashboard() {
    const [stats, setStats] = useState({ total_leads: 0, pipeline_value: 0, pending_tasks: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8000/api/dashboard/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch dashboard stats", err);
                setLoading(false);
            });
    }, []);

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Leads */}
                <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">Total Sourced Leads</h3>
                    <p className="text-4xl font-bold text-blue-400">{loading ? '...' : stats.total_leads}</p>
                    <p className="text-sm text-gray-500 mt-2">Active in database</p>
                </div>

                {/* Pipeline Value */}
                <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">Pipeline Value</h3>
                    <p className="text-4xl font-bold text-emerald-400">{loading ? '...' : formatCurrency(stats.pipeline_value)}</p>
                    <p className="text-sm text-gray-500 mt-2">Total active deal value</p>
                </div>

                {/* Tasks */}
                <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">Pending Tasks</h3>
                    <p className="text-4xl font-bold text-orange-400">{loading ? '...' : stats.pending_tasks}</p>
                    <p className="text-sm text-gray-500 mt-2">Actions due</p>
                </div>
            </div>
        </div>
    );
}
