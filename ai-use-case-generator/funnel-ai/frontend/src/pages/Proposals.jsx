import React, { useState, useEffect } from 'react';
import { fetchProposals, createProposal } from '../lib/api_proposals';
import { fetchLeads } from '../lib/api'; // Reuse leads for selection
import { Plus, FileText, Download, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Proposals() {
    const [proposals, setProposals] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ title: '', content: '', amount: '', lead_id: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [propsData, leadsData] = await Promise.all([fetchProposals(), fetchLeads()]);
            setProposals(propsData);
            setLeads(leadsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.lead_id) return;

        try {
            await createProposal({
                ...formData,
                amount: parseFloat(formData.amount) || 0,
                lead_id: parseInt(formData.lead_id)
            });
            setShowModal(false);
            setFormData({ title: '', content: '', amount: '', lead_id: '' });
            loadData();
        } catch (err) {
            alert('Failed to generate proposal');
        }
    };

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Proposals</h2>
                    <p className="text-gray-400 mt-1">Generate and track PDF proposals.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Proposal
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
                <div className="grid gap-4">
                    {proposals.length === 0 && (
                        <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl bg-white/5">
                            <p className="text-gray-400">No proposals generated yet.</p>
                        </div>
                    )}
                    {proposals.map(prop => (
                        <div key={prop.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{prop.title}</h3>
                                    <p className="text-sm text-gray-400">${prop.amount.toLocaleString()} • {new Date(prop.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            {prop.pdf_path ? (
                                <a
                                    href={`${API_URL}/api/proposals/${prop.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-sm text-gray-300 transition-colors"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download PDF
                                </a>
                            ) : (
                                <span className="text-xs text-yellow-500">Generating...</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-lg shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Generate Proposal</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Target Lead</label>
                                <select
                                    value={formData.lead_id}
                                    onChange={e => setFormData({ ...formData, lead_id: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select a Lead...</option>
                                    {leads.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name} ({l.company})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="e.g. Enterprise License Proposal"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Amount ($)</label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Content / Terms</label>
                                <textarea
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 h-32"
                                    placeholder="Outline the scope of work here..."
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-300">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium">Generate PDF</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
