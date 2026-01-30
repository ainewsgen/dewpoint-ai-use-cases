import React, { useState } from 'react';
import { Plus, Mail, Clock, CheckSquare, Trash2, GripVertical, AlertCircle, Sparkles } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

const STEP_ICONS = {
    email: Mail,
    delay: Clock,
    task: CheckSquare,
    branch: Sparkles
};

const STEP_COLORS = {
    email: 'blue',
    delay: 'yellow',
    task: 'green',
    branch: 'purple'
};

export default function WorkflowEditor({ steps, onAddStep, onUpdateStep, onDeleteStep, templates = [] }) {
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

    // In a real app, use Drag and Drop libraries. For MVP, we render a list.

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Campaign Workflow</h3>
                <div className="relative">
                    <button
                        onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Step
                    </button>

                    {isAddMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-20">
                            {[
                                { id: 'email', label: 'Send Email', icon: Mail },
                                { id: 'delay', label: 'Wait / Delay', icon: Clock },
                                { id: 'task', label: 'Manual Task', icon: CheckSquare },
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        onAddStep(type.id);
                                        setIsAddMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors"
                                >
                                    <type.icon className="w-4 h-4" />
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4 min-h-[400px]">
                {steps.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl bg-white/5">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-blue-400" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Build your sequence</h4>
                        <p className="text-gray-400 max-w-sm mx-auto">Add emails, delays, and tasks to create an automated outreach workflow.</p>
                    </div>
                ) : (
                    <div className="space-y-0 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-500/50 to-purple-500/50 z-0"></div>

                        {steps.map((step, index) => {
                            const Icon = STEP_ICONS[step.step_type] || AlertCircle;
                            const color = STEP_COLORS[step.step_type] || 'gray';

                            return (
                                <motion.div
                                    key={step.id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative z-10 flex gap-4 group"
                                >
                                    {/* Timeline Node */}
                                    <div className={`w-16 h-16 flex-shrink-0 flex flex-col items-center justify-center`}>
                                        <div className={`w-10 h-10 rounded-full bg-gray-900 border-2 border-${color}-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                                            <Icon className={`w-5 h-5 text-${color}-400`} />
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono mt-1">STEP {index + 1}</div>
                                    </div>

                                    {/* Step Card */}
                                    <div className="flex-1 bg-gray-900 border border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-all shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-white text-lg capitalize">{step.name || `${step.step_type} Step`}</h4>
                                                <p className="text-xs text-gray-400 uppercase tracking-wider">{step.step_type}</p>
                                            </div>
                                            <button
                                                onClick={() => onDeleteStep(step.id)}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Configuration Inputs */}
                                        <div className="space-y-3">
                                            {step.step_type === 'email' && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Email Template</label>
                                                        <select
                                                            value={step.template_id || ''}
                                                            onChange={(e) => onUpdateStep(step.id, { template_id: e.target.value })}
                                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"
                                                        >
                                                            <option value="">Select a template...</option>
                                                            {templates.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Response Logic */}
                                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                        <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Automated Response Logic</div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-medium text-green-400 mb-1">If Interested (Positive)</label>
                                                                <select
                                                                    value={step.branch_config?.positive_sentiment || 'next_step'}
                                                                    onChange={(e) => onUpdateStep(step.id, {
                                                                        branch_config: { ...step.branch_config, positive_sentiment: e.target.value }
                                                                    })}
                                                                    className="w-full bg-black/40 border border-white/10 rounded text-xs text-white p-2 focus:border-green-500/50 outline-none"
                                                                >
                                                                    <option value="next_step">Continue to Next Step</option>
                                                                    <option value="create_task">Create Manual Task</option>
                                                                    <option value="notify">Notify Me Only</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-medium text-red-400 mb-1">If Not Interested (Negative)</label>
                                                                <select
                                                                    value={step.branch_config?.negative_sentiment || 'disqualify'}
                                                                    onChange={(e) => onUpdateStep(step.id, {
                                                                        branch_config: { ...step.branch_config, negative_sentiment: e.target.value }
                                                                    })}
                                                                    className="w-full bg-black/40 border border-white/10 rounded text-xs text-white p-2 focus:border-red-500/50 outline-none"
                                                                >
                                                                    <option value="disqualify">Mark as Lost (Disqualify)</option>
                                                                    <option value="next_step">Continue Anyway</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {(step.step_type === 'task' || step.step_type === 'call') && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Instructions / Description</label>
                                                    <textarea
                                                        value={step.content_instruction || ''}
                                                        onChange={(e) => onUpdateStep(step.id, { content_instruction: e.target.value })}
                                                        placeholder="Describe what needs to be done..."
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none min-h-[80px]"
                                                    />
                                                </div>
                                            )}

                                            {step.step_type === 'delay' && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Wait Duration</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={step.wait_days}
                                                                onChange={(e) => onUpdateStep(step.id, { wait_days: parseInt(e.target.value) || 0 })}
                                                                className="bg-black/20 border border-white/10 rounded-lg p-2.5 text-white text-sm w-24 focus:border-blue-500 outline-none"
                                                            />
                                                            <span className="text-gray-400 text-sm">Days</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
