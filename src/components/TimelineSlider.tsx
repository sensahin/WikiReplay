
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Revision } from '@/lib/wikiApi';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

interface TimelineSliderProps {
    revisions: Revision[];
    currentIndex: number;
    onChange: (index: number) => void;
    isLoading?: boolean;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
    revisions,
    currentIndex,
    onChange,
    isLoading = false,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isPlaying && !isLoading) {
            playIntervalRef.current = setInterval(() => {
                if (currentIndex < revisions.length - 1) {
                    onChange(currentIndex + 1);
                } else {
                    setIsPlaying(false);
                }
            }, 1500);
        }
        return () => {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
            }
        };
    }, [isPlaying, currentIndex, revisions.length, onChange, isLoading]);

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0 && !isLoading) {
            onChange(currentIndex - 1);
        }
    }, [currentIndex, onChange, isLoading]);

    const handleNext = useCallback(() => {
        if (currentIndex < revisions.length - 1 && !isLoading) {
            onChange(currentIndex + 1);
        }
    }, [currentIndex, revisions.length, onChange, isLoading]);

    const togglePlay = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);

    const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!sliderRef.current || isLoading) return;
        
        const rect = sliderRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newIndex = Math.round(percentage * (revisions.length - 1));
        onChange(Math.max(0, Math.min(revisions.length - 1, newIndex)));
    }, [revisions.length, onChange, isLoading]);

    const handleMouseDown = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !sliderRef.current || isLoading) return;
        
        const rect = sliderRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newIndex = Math.round(percentage * (revisions.length - 1));
        onChange(Math.max(0, Math.min(revisions.length - 1, newIndex)));
    }, [isDragging, revisions.length, onChange, isLoading]);

    if (revisions.length === 0) return null;

    const currentRevision = revisions[currentIndex];
    const progress = revisions.length > 1 ? (currentIndex / (revisions.length - 1)) * 100 : 100;

    return (
        <div className="w-full bg-[#09090b] border-t border-white/[0.06]">
            <div className="px-4 md:px-6 lg:px-10 py-4 md:py-6">
                {/* Centered Controls */}
                <div className="flex items-center justify-center gap-3 md:gap-4 mb-4 md:mb-6">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0 || isLoading}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white/60 bg-white/[0.04] hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/[0.08]"
                    >
                        <ChevronLeft size={20} className="md:hidden" />
                        <ChevronLeft size={24} className="hidden md:block" />
                    </button>
                    
                    <button
                        onClick={togglePlay}
                        disabled={isLoading}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                    >
                        {isPlaying ? <Pause size={20} className="md:hidden" /> : <Play size={20} className="ml-0.5 md:hidden" />}
                        {isPlaying ? <Pause size={22} className="hidden md:block" /> : <Play size={22} className="ml-1 hidden md:block" />}
                    </button>
                    
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === revisions.length - 1 || isLoading}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white/60 bg-white/[0.04] hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/[0.08]"
                    >
                        <ChevronRight size={20} className="md:hidden" />
                        <ChevronRight size={24} className="hidden md:block" />
                    </button>
                </div>

                {/* Slider Track */}
                <div 
                    ref={sliderRef}
                    className="relative h-2 bg-white/[0.08] rounded-full cursor-pointer group"
                    onClick={handleSliderClick}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {/* Progress */}
                    <motion.div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    />

                    {/* Thumb */}
                    <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md cursor-grab active:cursor-grabbing"
                        style={{ left: `calc(${progress}% - 8px)` }}
                        initial={false}
                        animate={{ scale: isDragging ? 1.3 : 1 }}
                        whileHover={{ scale: 1.3 }}
                        transition={{ duration: 0.15 }}
                    />
                </div>

                {/* Timeline info row */}
                <div className="mt-2 md:mt-3 flex items-center justify-between">
                    <span className="text-[10px] md:text-[11px] text-white/30 hidden sm:block">
                        {revisions.length > 0 && format(new Date(revisions[0].timestamp), 'MMM yyyy')}
                    </span>
                    
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentRevision.revid}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-xs sm:text-sm w-full sm:w-auto justify-center"
                        >
                            <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-white font-medium">
                                    {format(new Date(currentRevision.timestamp), 'MMM d, yyyy')}
                                </span>
                                <span className="text-white/30">
                                    {format(new Date(currentRevision.timestamp), 'HH:mm')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-white/20 text-[11px] sm:text-sm">
                                <span className="truncate max-w-[120px] sm:max-w-none">
                                    by {currentRevision.user}
                                </span>
                                <span>
                                    · {currentIndex + 1}/{revisions.length.toLocaleString()}
                                </span>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <span className="text-[10px] md:text-[11px] text-white/30 hidden sm:block">
                        {revisions.length > 0 && format(new Date(revisions[revisions.length - 1].timestamp), 'MMM yyyy')}
                    </span>
                </div>
            </div>
        </div>
    );
};
