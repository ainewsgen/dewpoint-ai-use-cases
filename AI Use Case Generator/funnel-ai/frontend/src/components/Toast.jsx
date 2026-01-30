import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
    // User requested persistent messages that wait for click
    // Removed autoClose timer logic

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={onClose} // Allow clicking anywhere to dismiss
            className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border z-[300] cursor-pointer hover:bg-[#151515] transition-colors ${type === 'success' ? 'bg-[#0A0A0A] border-green-500/20 text-green-400' : 'bg-[#0A0A0A] border-red-500/20 text-red-400'
                }`}
        >
            {type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm font-medium text-white">{message}</span>
            <button className="ml-2 rounded-full p-1 opacity-60 hover:opacity-100 transition-opacity">
                <XCircle className="w-4 h-4 text-gray-400" />
            </button>
        </motion.div>
    );
};

export default Toast;
