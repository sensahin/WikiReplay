
'use client';

import React, { useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExtendedChange } from '@/lib/diffUtils';

const MarkdownRenderer = React.lazy(() =>
    import('./MarkdownRenderer').then((module) => ({ default: module.default }))
);

interface DiffViewerProps {
    diff: ExtendedChange[];
    isTransitioning?: boolean;
    onScrollToChange?: (scrollFn: () => void) => void;
    showLinks?: boolean;
    showRemoved?: boolean;
    highlightIntensity?: 'subtle' | 'vivid' | 'flat';
    autoScroll?: boolean;
    fontSize?: number;
    lineHeight?: number;
}

const DiffViewerComponent: React.FC<DiffViewerProps> = ({
    diff,
    isTransitioning = false,
    onScrollToChange,
    showLinks = false,
    showRemoved = true,
    highlightIntensity = 'subtle',
    autoScroll = true,
    fontSize = 15,
    lineHeight = 1.8,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapInline = useCallback((value: string, tag: 'ins' | 'del') => {
        const leading = value.match(/^\s*/)?.[0] ?? '';
        const trailing = value.match(/\s*$/)?.[0] ?? '';
        const core = value.slice(leading.length, value.length - trailing.length);
        if (!core.trim()) {
            return value;
        }
        return `${leading}<${tag}>${core}</${tag}>${trailing}`;
    }, []);

    const wrapMarkdownLine = useCallback((line: string, tag: 'ins' | 'del') => {
        if (!line.trim()) return line;
        const prefixMatch = line.match(/^(\s*(?:#{1,6}|\d+\.|[-*+]|>))(\s+)(.*)$/);
        if (!prefixMatch) {
            return wrapInline(line, tag);
        }
        const prefix = `${prefixMatch[1]}${prefixMatch[2]}`;
        const rest = prefixMatch[3];
        if (!rest.trim()) return line;
        return `${prefix}${wrapInline(rest, tag)}`;
    }, [wrapInline]);

    const wrapChange = useCallback((value: string, tag: 'ins' | 'del') => {
        const parts = value.split(/(\n)/);
        return parts
            .map((part) => (part === '\n' ? part : wrapMarkdownLine(part, tag)))
            .join('');
    }, [wrapMarkdownLine]);

    const highlightClasses = useMemo(() => {
        switch (highlightIntensity) {
            case 'vivid':
                return {
                    ins: 'bg-emerald-500/35 text-emerald-200 rounded-[3px] px-0.5 -mx-0.5 no-underline',
                    del: 'bg-red-500/30 text-red-200/90 line-through decoration-red-200/60 rounded-[3px] px-0.5 -mx-0.5',
                };
            case 'flat':
                return {
                    ins: 'text-emerald-300 no-underline',
                    del: 'text-red-400 line-through decoration-red-400/50',
                };
            default:
                return {
                    ins: 'bg-emerald-500/20 text-emerald-300 rounded-[3px] px-0.5 -mx-0.5 no-underline',
                    del: 'bg-red-500/15 text-red-400/70 line-through decoration-red-400/40 rounded-[3px] px-0.5 -mx-0.5',
                };
        }
    }, [highlightIntensity]);

    const diffMarkdown = useMemo(() => {
        if (!diff.length) return '';
        return diff
            .map((change) => {
                if (change.added) return wrapChange(change.value, 'ins');
                if (change.removed) return showRemoved ? wrapChange(change.value, 'del') : '';
                return change.value;
            })
            .join('');
    }, [diff, showRemoved, wrapChange]);

    const fallbackText = useMemo(
        () => diffMarkdown.replace(/<\/?(ins|del)>/g, ''),
        [diffMarkdown]
    );

    const scrollToFirstChange = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const element = container.querySelector('ins, del') as HTMLElement | null;
        if (!element) return;

        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollTop = element.offsetTop - containerRect.height / 2 + elementRect.height / 2;

        container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth',
        });
    }, []);

    useEffect(() => {
        if (onScrollToChange) {
            onScrollToChange(scrollToFirstChange);
        }
    }, [onScrollToChange, scrollToFirstChange]);

    useEffect(() => {
        if (!autoScroll) return;
        if (!isTransitioning && diff.length > 0) {
            const timer = setTimeout(scrollToFirstChange, 100);
            return () => clearTimeout(timer);
        }
    }, [autoScroll, isTransitioning, diff, scrollToFirstChange]);

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
                    key={diffMarkdown.slice(0, 200)}
                    className="prose prose-invert max-w-none text-white/80 font-[system-ui]"
                    style={{ fontSize, lineHeight, contentVisibility: 'auto', containIntrinsicSize: '1000px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <Suspense fallback={<div className="whitespace-pre-wrap text-white/70">{fallbackText}</div>}>
                        <MarkdownRenderer
                            markdown={diffMarkdown}
                            showLinks={showLinks}
                            highlightClasses={highlightClasses}
                        />
                    </Suspense>
                </motion.article>
            </AnimatePresence>
        </motion.div>
    );
};

export const DiffViewer = React.memo(DiffViewerComponent);
