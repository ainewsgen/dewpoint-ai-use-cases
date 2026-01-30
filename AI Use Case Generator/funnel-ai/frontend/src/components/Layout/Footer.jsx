import React from 'react';
import { Shield, Sparkles, AlertCircle } from 'lucide-react';

export function Footer() {
    return (
        <footer className="mt-auto py-8 border-t border-white/5 px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                    <span>&copy; {new Date().getFullYear()} Funnel.ai Inc.</span>
                    <a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-blue-400 transition-colors">Accessibility</a>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-gray-600" title="This application uses Artificial Intelligence">
                        <Sparkles className="w-3 h-3" />
                        <span>AI-Powered Platform</span>
                    </div>
                    <div className="flex items-center gap-1.5 hover:text-orange-400 transition-colors cursor-help" title="AI content may be inaccurate. Human review recommended.">
                        <AlertCircle className="w-3 h-3" />
                        <span>AI Disclosure</span>
                    </div>
                </div>
            </div>
            <div className="mt-2 text-[10px] text-gray-600 text-center md:text-left">
                Funnel.ai adheres to SOC2 compliance standards. All data is encrypted at rest and in transit.
            </div>
        </footer>
    );
}
