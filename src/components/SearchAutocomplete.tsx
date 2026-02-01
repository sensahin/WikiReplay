
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
    const isInitialMount = useRef(true);
    const hasUserInteracted = useRef(false);

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
            // Only open if user has interacted with the input
            setIsOpen(results.length > 0 && hasUserInteracted.current);
            setSelectedIndex(-1);
        } catch {
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search - skip on initial mount
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

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
        hasUserInteracted.current = false; // Reset after selection
        inputRef.current?.blur();
    };

    const handleFocus = () => {
        hasUserInteracted.current = true;
        if (suggestions.length > 0) {
            setIsOpen(true);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        hasUserInteracted.current = true;
        onChange(e.target.value);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative group">
                <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                        isOpen ? 'text-white/50' : 'text-white/30 group-focus-within:text-white/50'
                    }`}
                    size={16}
                />
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    className={`w-full bg-white/[0.06] border border-white/[0.08] py-2 md:py-2 pl-9 pr-8 focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all text-sm placeholder:text-white/30 ${
                        isOpen ? 'rounded-t-lg rounded-b-none border-b-transparent' : 'rounded-lg'
                    }`}
                    autoComplete="off"
                />
                {isLoading && (
                    <motion.div
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Loader2 className="animate-spin text-white/40" size={14} />
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {isOpen && suggestions.length > 0 && (
                    <motion.div
                        className="absolute top-full left-0 right-0 bg-[#131316] border border-white/[0.08] border-t-0 rounded-b-lg shadow-xl overflow-hidden z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    >
                        <ul className="py-1 max-h-[60vh] md:max-h-[280px] overflow-y-auto custom-scrollbar">
                            {suggestions.map((suggestion, index) => (
                                <li key={suggestion.title}>
                                    <button
                                        type="button"
                                        className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                                            selectedIndex === index
                                                ? 'bg-white/[0.08] text-white'
                                                : 'hover:bg-white/[0.04] text-white/80'
                                        }`}
                                        onClick={() => handleSelect(suggestion.title)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        {suggestion.thumbnail ? (
                                            <img
                                                src={suggestion.thumbnail}
                                                alt=""
                                                className="w-8 h-8 rounded object-cover bg-white/10 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                                                <FileText size={14} className="text-white/30" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">
                                                {suggestion.title}
                                            </p>
                                            {suggestion.description && (
                                                <p className="text-xs text-white/40 truncate">
                                                    {suggestion.description}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
