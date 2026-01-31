import React from 'react';
import { Search, Filter, TrendingUp } from 'lucide-react';

export default function FilterBar({ filters, onFilterChange }) {
    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md items-center mb-6">
            <div className="flex items-center gap-2 text-gray-400">
                <Filter className="w-5 h-5" />
                <span className="text-sm font-medium">Filters</span>
            </div>

            <div className="h-6 w-px bg-white/10 hidden md:block"></div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search prospects..."
                    value={filters.search || ''}
                    onChange={(e) => handleChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
            </div>

            {/* Source Select */}
            <div className="min-w-[150px]">
                <select
                    value={filters.source || ''}
                    onChange={(e) => handleChange('source', e.target.value)}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    style={{ backgroundImage: 'none' }} // Remove default arrow if needed, or keep it
                >
                    <option value="" className="bg-gray-900">All Sources</option>
                    <option value="manual" className="bg-gray-900">Manual</option>
                    <option value="csv_import" className="bg-gray-900">CSV Import</option>
                    <option value="scraper" className="bg-gray-900">Scraper</option>
                </select>
            </div>

            {/* Min Score */}
            <div className="relative w-32">
                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="number"
                    placeholder="Min Score"
                    min="0"
                    max="100"
                    value={filters.min_score || ''}
                    onChange={(e) => handleChange('min_score', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
            </div>
        </div>
    );
}
