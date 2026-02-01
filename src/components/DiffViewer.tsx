
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

    const scrollToFirstChange = useCallback(() => {
        if (firstChangeRef.current && containerRef.current) {
            const container = containerRef.current;
            const element = firstChangeRef.current;
            
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

    useEffect(() => {
        if (!isTransitioning && diff.length > 0) {
            const timer = setTimeout(scrollToFirstChange, 100);
            return () => clearTimeout(timer);
        }
    }, [isTransitioning, diff, scrollToFirstChange]);

    const firstChangeIndex = diff.findIndex(change => change.added || change.removed);

    return (
        <motion.div 
            ref={containerRef}
            className="w-full"
            initial={false}
            animate={{ 
                opacity: isTransitioning ? 0.4 : 1,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            <AnimatePresence mode="wait">
                <motion.article 
                    key={diff.map(d => d.value).join('').slice(0, 100)}
                    className="text-sm md:text-[15px] text-white/80 leading-[1.8] md:leading-[1.9] font-[system-ui]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {diff.map((change, index) => {
                        const isAdded = change.added;
                        const isRemoved = change.removed;
                        const isFirstChange = index === firstChangeIndex;

                        if (isAdded) {
                            return (
                                <span
                                    key={index}
                                    ref={isFirstChange ? firstChangeRef : undefined}
                                    className="bg-emerald-500/20 text-emerald-300 rounded-[3px] px-0.5 -mx-0.5"
                                >
                                    {change.value}
                                </span>
                            );
                        }
                        
                        if (isRemoved) {
                            return (
                                <span
                                    key={index}
                                    ref={isFirstChange ? firstChangeRef : undefined}
                                    className="bg-red-500/15 text-red-400/70 line-through decoration-red-400/40 rounded-[3px] px-0.5 -mx-0.5"
                                >
                                    {change.value}
                                </span>
                            );
                        }

                        return (
                            <span key={index} className="whitespace-pre-wrap">
                                {change.value}
                            </span>
                        );
                    })}
                </motion.article>
            </AnimatePresence>
        </motion.div>
    );
};
