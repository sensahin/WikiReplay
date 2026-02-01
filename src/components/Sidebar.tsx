
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Revision } from '@/lib/wikiApi';
import { format } from 'date-fns';
import { User, Calendar, MessageSquare, Info, Hash, GitBranch } from 'lucide-react';

interface SidebarProps {
    revision?: Revision;
}

export const Sidebar: React.FC<SidebarProps> = ({ revision }) => {
    if (!revision) return (
        <div className="w-full h-full flex flex-col gap-6 p-6 bg-gradient-to-b from-white/5 to-black/20 border-l border-white/10">
            <div className="animate-pulse flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-white/5 rounded-2xl" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col gap-6 p-6 bg-gradient-to-b from-white/5 to-black/20 border-l border-white/10 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
                <motion.div
                    key={revision.revid}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="space-y-6"
                >
                    {/* Revision Info */}
                    <div className="space-y-2">
                        <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                            <GitBranch size={12} />
                            Revision Info
                        </h2>
                        <motion.div 
                            className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg backdrop-blur-sm"
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center gap-3 text-white mb-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                    <User size={14} />
                                </div>
                                <span className="font-semibold text-sm">{revision.user}</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/60 text-xs">
                                <Calendar size={14} className="text-blue-400" />
                                <span>{format(new Date(revision.timestamp), 'PPP p')}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Edit Summary */}
                    <div className="space-y-2">
                        <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                            <MessageSquare size={12} />
                            Edit Summary
                        </h2>
                        <motion.div 
                            className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg backdrop-blur-sm"
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                            transition={{ duration: 0.2 }}
                        >
                            <p className="text-white/80 text-sm leading-relaxed">
                                {revision.comment ? (
                                    <span className="italic">&ldquo;{revision.comment}&rdquo;</span>
                                ) : (
                                    <span className="text-white/40 italic">No edit summary provided.</span>
                                )}
                            </p>
                        </motion.div>
                    </div>

                    {/* Technical Details */}
                    <div className="space-y-2">
                        <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                            <Hash size={12} />
                            Technical Details
                        </h2>
                        <motion.div 
                            className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg backdrop-blur-sm space-y-3"
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/40 flex items-center gap-2">
                                    <Info size={12} className="text-purple-400" /> 
                                    Revision ID
                                </span>
                                <span className="text-white/80 font-mono bg-white/5 px-2 py-0.5 rounded">{revision.revid}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/40 flex items-center gap-2">
                                    <Info size={12} className="text-blue-400" /> 
                                    Parent ID
                                </span>
                                <span className="text-white/80 font-mono bg-white/5 px-2 py-0.5 rounded">{revision.parentid || 'None'}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 mt-auto pt-4 border-t border-white/10">
                        <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold">Legend</h2>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded bg-emerald-500/25 border border-emerald-400/40" />
                                <span className="text-emerald-300">Added text</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded bg-rose-500/20 border border-rose-400/20" />
                                <span className="text-rose-300/60 line-through">Removed text</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
