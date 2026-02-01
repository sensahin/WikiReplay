
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExtendedChange } from '@/lib/diffUtils';

interface DiffViewerProps {
    diff: ExtendedChange[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
    return (
        <div className="max-w-4xl mx-auto font-serif text-lg leading-relaxed p-12 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden min-h-[60vh]">
            <div className="flex flex-wrap gap-x-1.5 gap-y-2 whitespace-pre-wrap">
                <AnimatePresence mode="popLayout" initial={false}>
                    {diff.map((change, index) => {
                        const isAdded = change.added;
                        const isRemoved = change.removed;

                        let bgColor = '';
                        let textColor = 'text-white/90';
                        let borderColor = 'border-transparent';
                        let textDecoration = '';

                        if (isAdded) {
                            bgColor = 'bg-emerald-500/20';
                            textColor = 'text-emerald-300';
                            borderColor = 'border-emerald-500/30';
                        } else if (isRemoved) {
                            bgColor = 'bg-rose-500/20';
                            textColor = 'text-rose-300/40';
                            borderColor = 'border-rose-500/10';
                            textDecoration = 'line-through decoration-rose-500/30';
                        }

                        // Handle newlines in the cleaned text to preserve paragraph breaks
                        const parts = change.value.split('\n');

                        return parts.map((part, pIndex) => (
                            <React.Fragment key={`${index}-${pIndex}`}>
                                {pIndex > 0 && <div className="w-full h-8" />}
                                {part.trim() && (
                                    <motion.span
                                        initial={isAdded ? { opacity: 0, scale: 0.95, y: 10 } : { opacity: 1, scale: 1, y: 0 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={isRemoved ? { opacity: 0, scale: 0.9, y: -10 } : {}}
                                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                        className={`inline px-1 rounded transition-colors ${bgColor} ${textColor} ${borderColor} ${textDecoration}`}
                                    >
                                        {part}
                                    </motion.span>
                                )}
                            </React.Fragment>
                        ) as React.ReactNode);
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};
