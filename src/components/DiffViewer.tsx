
'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExtendedChange } from '@/lib/diffUtils';

interface DiffViewerProps {
    diff: ExtendedChange[];
    isTransitioning?: boolean;
    onScrollToChange?: (scrollFn: () => void) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, isTransitioning = false, onScrollToChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const firstChangeRef = useRef<HTMLSpanElement>(null);

    // Scroll to first change when diff updates
    const scrollToFirstChange = useCallback(() => {
        if (firstChangeRef.current && containerRef.current) {
            const container = containerRef.current;
            const element = firstChangeRef.current;
            
            // Calculate the scroll position to center the element
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const scrollTop = element.offsetTop - containerRect.height / 2 + elementRect.height / 2;
            
            container.scrollTo({
                top: Math.max(0, scrollTop),
                behavior: 'smooth'
            });
        }
    }, []);

    useEffect(() => {
        if (onScrollToChange) {
            onScrollToChange(scrollToFirstChange);
        }
    }, [onScrollToChange, scrollToFirstChange]);

    // Auto-scroll to first change after transition completes
    useEffect(() => {
        if (!isTransitioning && diff.length > 0) {
            const timer = setTimeout(scrollToFirstChange, 100);
            return () => clearTimeout(timer);
        }
    }, [isTransitioning, diff, scrollToFirstChange]);

    // Find first change index for scroll targeting
    const firstChangeIndex = diff.findIndex(change => change.added || change.removed);

    return (
        <motion.div 
            ref={containerRef}
            className="max-w-4xl mx-auto font-serif text-lg leading-relaxed p-12 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl overflow-y-auto min-h-[60vh] max-h-[calc(100vh-320px)] scroll-smooth"
            initial={false}
            animate={{ 
                opacity: isTransitioning ? 0.3 : 1,
                filter: isTransitioning ? 'blur(4px)' : 'blur(0px)'
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
            <AnimatePresence mode="wait">
                <motion.div 
                    key={diff.map(d => d.value).join('').slice(0, 100)}
                    className="flex flex-wrap gap-x-1.5 gap-y-2 whitespace-pre-wrap"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                >
                    {diff.map((change, index) => {
                        const isAdded = change.added;
                        const isRemoved = change.removed;
                        const isFirstChange = index === firstChangeIndex;

                        let bgColor = '';
                        let textColor = 'text-white/90';
                        let borderStyle = '';
                        let textDecoration = '';
                        let glowEffect = '';

                        if (isAdded) {
                            bgColor = 'bg-emerald-500/25';
                            textColor = 'text-emerald-200';
                            borderStyle = 'border border-emerald-400/40';
                            glowEffect = 'shadow-[0_0_20px_rgba(16,185,129,0.3)]';
                        } else if (isRemoved) {
                            bgColor = 'bg-rose-500/20';
                            textColor = 'text-rose-300/60';
                            borderStyle = 'border border-rose-400/20';
                            textDecoration = 'line-through decoration-rose-400/50 decoration-2';
                        }

                        // Handle newlines in the cleaned text to preserve paragraph breaks
                        // Filter out empty parts to avoid double spacing
                        const parts = change.value.split(/\n+/).filter(p => p.trim());

                        return parts.map((part, pIndex) => (
                            <React.Fragment key={`${index}-${pIndex}`}>
                                {pIndex > 0 && <div className="w-full h-4" />}
                                <motion.span
                                    ref={isFirstChange && pIndex === 0 ? firstChangeRef : undefined}
                                    initial={isAdded ? { opacity: 0, scale: 0.9, y: 15, filter: 'blur(4px)' } : { opacity: 1, scale: 1, y: 0 }}
                                    animate={{ 
                                        opacity: 1, 
                                        scale: 1, 
                                        y: 0,
                                        filter: 'blur(0px)'
                                    }}
                                    exit={isRemoved ? { opacity: 0, scale: 0.85, y: -15, filter: 'blur(4px)' } : {}}
                                    transition={{ 
                                        duration: 0.6, 
                                        ease: [0.23, 1, 0.32, 1],
                                        delay: isAdded ? index * 0.02 : 0
                                    }}
                                    className={`inline px-1.5 py-0.5 rounded-md transition-all duration-300 ${bgColor} ${textColor} ${borderStyle} ${textDecoration} ${glowEffect} ${isAdded || isRemoved ? 'font-medium' : ''}`}
                                >
                                    {part}
                                </motion.span>
                            </React.Fragment>
                        ) as React.ReactNode);
                    })}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};
