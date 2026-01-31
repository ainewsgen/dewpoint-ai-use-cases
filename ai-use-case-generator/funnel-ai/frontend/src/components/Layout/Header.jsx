import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import NotificationCenter from '../NotificationCenter';

import { useAuth } from '../../context/AuthContext';

export function Header() {
    const { user } = useAuth();

    // Get initials from full name
    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 ml-64">
            <div className="flex items-center max-w-md w-full">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search leads, companies, or deals..."
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-light"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {/* Notification Center */}
                <NotificationCenter />

                <div className="h-8 w-px bg-white/10" />

                <Link to="/settings" className="flex items-center space-x-2 p-1 pr-3 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
                    <div className="h-8 w-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-black">
                        {getInitials(user?.full_name)}
                    </div>
                    <span className="text-sm font-medium text-gray-200">{user?.full_name || 'User'}</span>
                </Link>
            </div>
        </header>
    );
}
