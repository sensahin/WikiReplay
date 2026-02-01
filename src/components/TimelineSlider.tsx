
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

    // Auto-play functionality
    useEffect(() => {
        if (isPlaying && !isLoading) {
            playIntervalRef.current = setInterval(() => {
                if (currentIndex < revisions.length - 1) {
                    onChange(currentIndex + 1);
                } else {
                    setIsPlaying(false);
                }
            }, 2000);
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
        <motion.div 
            className="w-full bg-gradient-to-b from-black/80 to-black/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
            <div className="max-w-6xl mx-auto px-8 py-6">
                {/* Revision Info */}
                <div className="flex justify-between items-center mb-5">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentRevision.revid}
                            className="flex flex-col"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <span className="text-white/40 text-[10px] font-medium uppercase tracking-[0.2em] mb-1">
                                Revision {currentIndex + 1} of {revisions.length}
                            </span>
                            <span className="text-white text-lg font-bold tracking-tight">
                                {format(new Date(currentRevision.timestamp), 'MMMM d, yyyy')}
                                <span className="text-white/40 font-normal ml-2">
                                    {format(new Date(currentRevision.timestamp), 'HH:mm')}
                                </span>
                            </span>
                        </motion.div>
                    </AnimatePresence>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePrevious}
                            disabled={currentIndex === 0 || isLoading}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={20} />
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={togglePlay}
                            disabled={isLoading}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 transition-all"
                        >
                            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleNext}
                            disabled={currentIndex === revisions.length - 1 || isLoading}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={20} />
                        </motion.button>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentRevision.user}
                            className="flex flex-col items-end text-right"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <span className="text-white/40 text-[10px] font-medium uppercase tracking-[0.2em] mb-1">Editor</span>
                            <span className="text-white font-medium">{currentRevision.user}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Timeline Track */}
                <div 
                    ref={sliderRef}
                    className="relative h-3 bg-white/10 rounded-full cursor-pointer overflow-hidden group"
                    onClick={handleSliderClick}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {/* Progress Fill */}
                    <motion.div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    />
                    
                    {/* Glow Effect */}
                    <motion.div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50 rounded-full blur-md"
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    />

                    {/* Revision Markers */}
                    <div className="absolute inset-0 flex justify-between items-center px-0.5">
                        {revisions.length <= 30 && revisions.map((_, i) => (
                            <motion.div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                    i === currentIndex 
                                        ? 'bg-white scale-150 shadow-lg shadow-white/50' 
                                        : i < currentIndex 
                                            ? 'bg-white/60' 
                                            : 'bg-white/20'
                                }`}
                                whileHover={{ scale: 1.5 }}
                            />
                        ))}
                    </div>

                    {/* Draggable Thumb */}
                    <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg shadow-black/30 cursor-grab active:cursor-grabbing"
                        style={{ left: `calc(${progress}% - 10px)` }}
                        initial={false}
                        animate={{ scale: isDragging ? 1.2 : 1 }}
                        whileHover={{ scale: 1.2 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="absolute inset-1 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                    </motion.div>
                </div>

                {/* Timeline Labels */}
                <div className="mt-3 flex justify-between text-[10px] text-white/30 uppercase tracking-[0.15em]">
                    <span>{revisions.length > 0 && format(new Date(revisions[0].timestamp), 'MMM yyyy')}</span>
                    <motion.span 
                        className="text-white/50"
                        animate={{ opacity: isLoading ? 0.5 : 1 }}
                    >
                        {isLoading ? 'Loading...' : 'Drag or click to navigate'}
                    </motion.span>
                    <span>{revisions.length > 0 && format(new Date(revisions[revisions.length - 1].timestamp), 'MMM yyyy')}</span>
                </div>
            </div>
        </motion.div>
    );
};
