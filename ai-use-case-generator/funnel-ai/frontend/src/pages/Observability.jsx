import React, { useState, useEffect } from 'react';
import { Activity, Server, AlertTriangle, Clock } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

const BASE = import.meta.env.VITE_API_URL || '/api';

export default function Observability() {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Live update
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [logsRes, statsRes] = await Promise.all([
                fetch(`${BASE}/observability/logs`),
                fetch(`${BASE}/observability/stats`)
            ]);
            setLogs(await logsRes.json());
            setStats(await statsRes.json());
        } catch (err) {
            console.error(err);
        }
    };

    // Process logs for charts
    const chartData = logs.slice().reverse().map(l => ({
        time: new Date(l.timestamp).toLocaleTimeString(),
        latency: l.duration_ms,
        status: l.status_code
    })).slice(-20); // Last 20 requests

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">System Observability</h2>
                <p className="text-gray-400 mt-1">Real-time metrics and tracing.</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Server className="w-5 h-5" /></div>
                            <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Online</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.total_requests}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total Requests</div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Clock className="w-5 h-5" /></div>
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.avg_latency_ms}ms</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Avg Latency</div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><AlertTriangle className="w-5 h-5" /></div>
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.error_rate}%</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Error Rate</div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><Activity className="w-5 h-5" /></div>
                        </div>
                        <div className="text-2xl font-bold text-white">HEALTHY</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">System Status</div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 h-80">
                    <h3 className="text-lg font-semibold text-gray-200 mb-6">API Latency (ms)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis dataKey="time" stroke="#6b7280" fontSize={12} tick={false} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
                                itemStyle={{ color: '#60a5fa' }}
                            />
                            <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Live Log Stream */}
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 h-80 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Live Request Log</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
                        {logs.map(log => (
                            <div key={log.id} className="grid grid-cols-12 gap-2 p-2 rounded hover:bg-white/5 border-b border-white/5 last:border-0">
                                <div className="col-span-2 text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                <div className={`col-span-1 font-bold ${log.method === 'GET' ? 'text-blue-400' : 'text-green-400'}`}>{log.method}</div>
                                <div className="col-span-1 text-gray-400">{log.status_code}</div>
                                <div className="col-span-2 text-right text-gray-500">{Math.round(log.duration_ms)}ms</div>
                                <div className="col-span-6 text-gray-300 truncate" title={log.path}>{log.path}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
