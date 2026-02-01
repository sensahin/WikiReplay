
'use client';

import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { ExtendedChange } from '@/lib/diffUtils';

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

export const DiffViewer: React.FC<DiffViewerProps> = ({
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
    const sanitizeSchema = useMemo(() => {
        const baseTags = defaultSchema.tagNames ?? [];
        return {
            ...defaultSchema,
            tagNames: [...baseTags, 'ins', 'del'],
        };
    }, []);

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
                    style={{ fontSize, lineHeight }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                        components={{
                            ins: (props) => (
                                <ins
                                    {...props}
                                    className={highlightClasses.ins}
                                />
                            ),
                            del: (props) => (
                                <del
                                    {...props}
                                    className={highlightClasses.del}
                                />
                            ),
                            a: (props) =>
                                showLinks ? (
                                    <a
                                        {...props}
                                        className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    />
                                ) : (
                                    <span>{props.children}</span>
                                ),
                        }}
                    >
                        {diffMarkdown}
                    </ReactMarkdown>
                </motion.article>
            </AnimatePresence>
        </motion.div>
    );
};
