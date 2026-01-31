import React, { useState, useEffect } from 'react';
import { X, Search, Check, Users } from 'lucide-react';
import { fetchLeads } from '../../lib/api'; // Standard leads fetch

export default function AddLeadsToCampaignModal({ isOpen, onClose, onAdd, campaignName }) {
    const [leads, setLeads] = useState([]);
    const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadLeads();
        }
    }, [isOpen]);

    const loadLeads = async () => {
        setLoading(true);
        try {
            // Fetch all leads for now. In real app might want to filter out those already in campaign.
            // But MVP: just show all.
            const data = await fetchLeads();
            setLeads(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleLead = (id) => {
        const newSet = new Set(selectedLeadIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedLeadIds(newSet);
    };

    const handleConfirm = () => {
        onAdd(Array.from(selectedLeadIds));
    };

    const filteredLeads = leads.filter(l =>
        (l.first_name + ' ' + l.last_name + ' ' + l.company).toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-white">Add Leads to Campaign</h3>
                        <p className="text-sm text-gray-400">Select leads to enroll in <span className="text-blue-400">{campaignName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center p-10"><div className="animate-spin w-6 h-6 border-2 border-blue-500 rounded-full border-t-transparent"></div></div>
                    ) : (
                        <div className="space-y-1">
                            {filteredLeads.map(lead => (
                                <div
                                    key={lead.id}
                                    onClick={() => toggleLead(lead.id)}
                                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedLeadIds.has(lead.id) ? 'bg-blue-600/20 border border-blue-600/50' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className={`w-5 h-5 rounded border mr-4 flex items-center justify-center ${selectedLeadIds.has(lead.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
                                        {selectedLeadIds.has(lead.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <h4 className="text-white font-medium">{lead.first_name} {lead.last_name}</h4>
                                            <span className="text-xs text-gray-400">{lead.company}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{lead.email}</p>
                                    </div>
                                    <div className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                                        {lead.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-between items-center bg-gray-900 rounded-b-xl">
                    <span className="text-sm text-gray-400">{selectedLeadIds.size} leads selected</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-300">Cancel</button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedLeadIds.size === 0}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium shadow-lg shadow-blue-900/20"
                        >
                            Add to Campaign
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
