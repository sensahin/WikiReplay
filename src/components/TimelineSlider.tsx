
'use client';

import React from 'react';
import { Revision } from '@/lib/wikiApi';
import { format } from 'date-fns';

interface TimelineSliderProps {
    revisions: Revision[];
    currentIndex: number;
    onChange: (index: number) => void;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
    revisions,
    currentIndex,
    onChange,
}) => {
    if (revisions.length === 0) return null;

    const currentRevision = revisions[currentIndex];

    return (
        <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                    <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Current Revision</span>
                    <span className="text-white text-lg font-bold">
                        {format(new Date(currentRevision.timestamp), 'MMM d, yyyy HH:mm')}
                    </span>
                </div>
                <div className="flex flex-col items-end text-right">
                    <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Editor</span>
                    <span className="text-white font-medium">{currentRevision.user}</span>
                </div>
            </div>

            <div className="relative h-12 flex items-center">
                <input
                    type="range"
                    min="0"
                    max={revisions.length - 1}
                    value={currentIndex}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2 pointer-events-none px-1">
                    {revisions.map((_, i) => (
                        <div
                            key={i}
                            className={`w-1 h-3 rounded-full transition-colors ${i <= currentIndex ? 'bg-blue-400' : 'bg-white/10'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-4 text-white/40 text-[10px] flex justify-between uppercase tracking-[0.2em]">
                <span>Older</span>
                <span>Latest</span>
            </div>
        </div>
    );
};
