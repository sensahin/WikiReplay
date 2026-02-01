
'use client';

import React from 'react';
import { Revision } from '@/lib/wikiApi';
import { format } from 'date-fns';
import { User, Calendar, MessageSquare, Info } from 'lucide-react';

interface SidebarProps {
    revision?: Revision;
}

export const Sidebar: React.FC<SidebarProps> = ({ revision }) => {
    if (!revision) return (
        <div className="w-80 flex flex-col gap-6 p-6 bg-white/5 border-l border-white/10 h-full">
            <div className="animate-pulse flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-white/5 rounded-2xl" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-80 flex flex-col gap-6 p-6 bg-white/5 border-l border-white/10 h-full overflow-y-auto">
            <div className="space-y-1">
                <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold">Revision Info</h2>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg">
                    <div className="flex items-center gap-3 text-white mb-2">
                        <User size={16} className="text-blue-400" />
                        <span className="font-semibold text-sm">{revision.user}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/60 text-xs">
                        <Calendar size={14} />
                        <span>{format(new Date(revision.timestamp), 'PPP p')}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold">Edit Summary</h2>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg">
                    <div className="flex items-start gap-3">
                        <MessageSquare size={16} className="text-purple-400 mt-1 flex-shrink-0" />
                        <p className="text-white/80 text-sm leading-relaxed italic">
                            {revision.comment || "No edit summary provided."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold">Details</h2>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40 flex items-center gap-2"><Info size={14} /> ID</span>
                        <span className="text-white/80 font-mono">{revision.revid}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40 flex items-center gap-2"><Info size={14} /> Parent</span>
                        <span className="text-white/80 font-mono">{revision.parentid}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
