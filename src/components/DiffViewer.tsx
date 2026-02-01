
'use client';

import React, { useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExtendedChange, InfoboxData } from '@/lib/diffUtils';

const MarkdownRenderer = React.lazy(() =>
    import('./MarkdownRenderer').then((module) => ({ default: module.default }))
);

const InfoboxRenderer = React.lazy(() =>
    import('./InfoboxRenderer').then((module) => ({ default: module.default }))
);

interface DiffViewerProps {
    diff: ExtendedChange[];
    infoboxes?: InfoboxData[];
    isTransitioning?: boolean;
    onScrollToChange?: (scrollFn: () => void) => void;
    showLinks?: boolean;
    showImages?: boolean;
    showTemplates?: boolean;
    highlightIntensity?: 'subtle' | 'vivid' | 'flat';
    viewStyle?: 'inline' | 'split';
    autoScroll?: boolean;
    fontSize?: number;
    lineHeight?: number;
}

const DiffViewerComponent: React.FC<DiffViewerProps> = ({
    diff,
    infoboxes = [],
    isTransitioning = false,
    onScrollToChange,
    showLinks = false,
    showImages = false,
    showTemplates = false,
    highlightIntensity = 'subtle',
    viewStyle = 'inline',
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
                if (change.removed) return wrapChange(change.value, 'del');
                return change.value;
            })
            .join('');
    }, [diff, wrapChange]);

    const leftMarkdown = useMemo(() => {
        if (!diff.length) return '';
        return diff
            .map((change) => {
                if (change.added) return '';
                if (change.removed) return wrapChange(change.value, 'del');
                return change.value;
            })
            .join('');
    }, [diff, wrapChange]);

    const rightMarkdown = useMemo(() => {
        if (!diff.length) return '';
        return diff
            .map((change) => {
                if (change.added) return wrapChange(change.value, 'ins');
                if (change.removed) return '';
                return change.value;
            })
            .join('');
    }, [diff, wrapChange]);

    const renderFallback = (
        <div className="flex items-center gap-2 text-white/40 text-sm py-8">
            <span className="h-2 w-2 rounded-full bg-white/30 animate-pulse" />
            Rendering...
        </div>
    );

    const contentKey = viewStyle === 'split'
        ? `${leftMarkdown.slice(0, 120)}-${rightMarkdown.slice(0, 120)}`
        : diffMarkdown.slice(0, 200);

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

    const hasInfoboxes = showTemplates && infoboxes && infoboxes.length > 0;

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
                    key={contentKey}
                    className="prose prose-invert max-w-none text-white/80 font-[system-ui] prose-p:my-3 prose-headings:mt-5 prose-headings:mb-3 prose-ul:my-3 prose-ol:my-3"
                    style={{ fontSize, lineHeight, contentVisibility: 'auto', containIntrinsicSize: '1000px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {viewStyle === 'split' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Before</div>
                                <Suspense fallback={renderFallback}>
                                    <MarkdownRenderer
                                        markdown={leftMarkdown}
                                        showLinks={showLinks}
                                        showImages={showImages}
                                        highlightClasses={highlightClasses}
                                    />
                                </Suspense>
                            </div>
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">After</div>
                                <Suspense fallback={renderFallback}>
                                    <MarkdownRenderer
                                        markdown={rightMarkdown}
                                        showLinks={showLinks}
                                        showImages={showImages}
                                        highlightClasses={highlightClasses}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    ) : (
                        <div className={hasInfoboxes ? 'relative' : ''}>
                            {/* Infobox floated to the right like Wikipedia */}
                            {hasInfoboxes && (
                                <div className="float-right w-[300px] ml-5 mb-4 not-prose">
                                    <Suspense fallback={renderFallback}>
                                        <InfoboxRenderer
                                            infoboxes={infoboxes}
                                            showImages={showImages}
                                        />
                                    </Suspense>
                                </div>
                            )}
                            <Suspense fallback={renderFallback}>
                                <MarkdownRenderer
                                    markdown={diffMarkdown}
                                    showLinks={showLinks}
                                    showImages={showImages}
                                    highlightClasses={highlightClasses}
                                />
                            </Suspense>
                            {hasInfoboxes && <div className="clear-both" />}
                        </div>
                    )}
                </motion.article>
            </AnimatePresence>
        </motion.div>
    );
};

export const DiffViewer = React.memo(DiffViewerComponent);
