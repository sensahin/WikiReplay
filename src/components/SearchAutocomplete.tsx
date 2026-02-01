
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, FileText } from 'lucide-react';
import { fetchSearchSuggestions, SearchSuggestion } from '@/lib/wikiApi';

interface SearchAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (title: string) => void;
    placeholder?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
    value,
    onChange,
    onSelect,
    placeholder = 'Search Wikipedia article...',
}) => {
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch suggestions with debounce
    const fetchSuggestions = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const results = await fetchSearchSuggestions(query);
            setSuggestions(results);
            setIsOpen(results.length > 0);
            setSelectedIndex(-1);
        } catch {
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            fetchSuggestions(value);
        }, 200);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [value, fetchSuggestions]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' && suggestions.length > 0) {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    handleSelect(suggestions[selectedIndex].title);
                } else if (value.trim()) {
                    onSelect(value.trim());
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleSelect = (title: string) => {
        onChange(title);
        onSelect(title);
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
    };

    const handleFocus = () => {
        if (suggestions.length > 0) {
            setIsOpen(true);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative group">
                <Search
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                        isOpen ? 'text-blue-400' : 'text-white/30 group-focus-within:text-blue-400'
                    }`}
                    size={18}
                />
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    className={`w-full bg-white/5 border border-white/10 py-2.5 pl-12 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all text-sm ${
                        isOpen ? 'rounded-t-2xl rounded-b-none border-b-0' : 'rounded-full'
                    }`}
                    autoComplete="off"
                />
                {isLoading && (
                    <motion.div
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Loader2 className="animate-spin text-blue-400" size={16} />
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {isOpen && suggestions.length > 0 && (
                    <motion.div
                        className="absolute top-full left-0 right-0 bg-[#0a0a0a]/98 backdrop-blur-xl border border-white/10 border-t-0 rounded-b-2xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <ul className="py-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                            {suggestions.map((suggestion, index) => (
                                <motion.li
                                    key={suggestion.title}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    <button
                                        type="button"
                                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all ${
                                            selectedIndex === index
                                                ? 'bg-blue-500/20 text-white'
                                                : 'hover:bg-white/5 text-white/80'
                                        }`}
                                        onClick={() => handleSelect(suggestion.title)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        {suggestion.thumbnail ? (
                                            <img
                                                src={suggestion.thumbnail}
                                                alt=""
                                                className="w-10 h-10 rounded-lg object-cover bg-white/10 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                <FileText size={18} className="text-white/30" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {suggestion.title}
                                            </p>
                                            {suggestion.description && (
                                                <p className="text-xs text-white/40 truncate mt-0.5">
                                                    {suggestion.description}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                </motion.li>
                            ))}
                        </ul>
                        <div className="px-4 py-2 border-t border-white/5 text-[10px] text-white/30 uppercase tracking-wider flex items-center justify-between">
                            <span>↑↓ Navigate</span>
                            <span>↵ Select</span>
                            <span>Esc Close</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
