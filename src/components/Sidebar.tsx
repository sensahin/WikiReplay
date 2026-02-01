
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Revision, isIPAddress, fetchIPGeolocation, GeoLocation } from '@/lib/wikiApi';
import { format } from 'date-fns';
import { User, Calendar, MessageSquare, Info, Hash, GitBranch, Globe, Loader2, ExternalLink, Tag } from 'lucide-react';

// Convert country code to flag emoji
function getCountryFlag(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// Format tag name for display
function formatTagName(tag: string): string {
    return tag
        .replace(/^mw-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Get tag styling based on tag type
function getTagStyle(tag: string): string {
    const tagLower = tag.toLowerCase();
    
    if (tagLower.includes('revert') || tagLower.includes('undo') || tagLower.includes('rollback')) {
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
    }
    if (tagLower.includes('mobile')) {
        return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    }
    if (tagLower.includes('visual') || tagLower.includes('wikieditor')) {
        return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
    }
    if (tagLower.includes('bot')) {
        return 'bg-pink-500/20 text-pink-300 border border-pink-500/30';
    }
    if (tagLower.includes('redirect')) {
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }
    if (tagLower.includes('blank') || tagLower.includes('replace')) {
        return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
    }
    if (tagLower.includes('newcomer') || tagLower.includes('task')) {
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
    // Default style
    return 'bg-white/10 text-white/60 border border-white/20';
}

interface SidebarProps {
    revision?: Revision;
    totalRevisions?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ revision, totalRevisions = 0 }) => {
    const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null);
    const [isLoadingGeo, setIsLoadingGeo] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);

    // Fetch geolocation when revision changes
    useEffect(() => {
        if (!revision) {
            setGeoLocation(null);
            setIsAnonymous(false);
            return;
        }

        const checkAndFetchGeo = async () => {
            const anonymous = isIPAddress(revision.user);
            setIsAnonymous(anonymous);

            if (anonymous) {
                setIsLoadingGeo(true);
                const geo = await fetchIPGeolocation(revision.user);
                setGeoLocation(geo);
                setIsLoadingGeo(false);
            } else {
                setGeoLocation(null);
            }
        };

        checkAndFetchGeo();
    }, [revision?.revid, revision?.user]);

    if (!revision) return (
        <div className="w-full h-full flex flex-col gap-6 pt-8 px-6 pb-6 bg-gradient-to-b from-[#0a0a0a] to-black/20 border-l border-white/10">
            <div className="animate-pulse flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-white/5 rounded-2xl" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col gap-5 pt-8 px-6 pb-6 bg-gradient-to-b from-[#0a0a0a] to-black/20 border-l border-white/10 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
                <motion.div
                    key={revision.revid}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="space-y-6"
                >
                    {/* Total Revisions */}
                    <div className="space-y-2">
                        <div 
                            className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-4 border border-blue-500/20 shadow-lg backdrop-blur-sm"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-white/60 text-xs uppercase tracking-wider">Total Revisions</span>
                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                    {totalRevisions.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Revision Info */}
                    <div className="space-y-2">
                        <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                            <GitBranch size={12} />
                            Current Revision
                        </h2>
                        <div 
                            className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg backdrop-blur-sm"
                        >
                            <div className="flex items-center gap-3 text-white mb-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isAnonymous 
                                        ? 'bg-gradient-to-br from-orange-500 to-red-500' 
                                        : 'bg-gradient-to-br from-blue-500 to-purple-500'
                                }`}>
                                    {isAnonymous ? <Globe size={14} /> : <User size={14} />}
                                </div>
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-2">
                                        <a 
                                            href={isAnonymous 
                                                ? `https://en.wikipedia.org/wiki/Special:Contributions/${revision.user}`
                                                : `https://en.wikipedia.org/wiki/User:${encodeURIComponent(revision.user)}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-sm hover:text-blue-400 transition-colors flex items-center gap-1 group"
                                        >
                                            {isAnonymous ? 'Anonymous' : revision.user}
                                            <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                        {/* Location flag for anonymous users */}
                                        {isAnonymous && !isLoadingGeo && geoLocation && (
                                            <span className="text-base" title={`${geoLocation.city ? geoLocation.city + ', ' : ''}${geoLocation.country}`}>
                                                {getCountryFlag(geoLocation.countryCode)}
                                            </span>
                                        )}
                                    </div>
                                    {isAnonymous && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-white/40 font-mono">{revision.user}</span>
                                            {isLoadingGeo && (
                                                <Loader2 size={10} className="animate-spin text-white/40" />
                                            )}
                                            {!isLoadingGeo && geoLocation && (
                                                <span className="text-[10px] text-white/40">
                                                    {[geoLocation.city, geoLocation.country].filter(Boolean).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-white/60 text-xs">
                                <Calendar size={14} className="text-blue-400" />
                                <span>{format(new Date(revision.timestamp), 'PPP p')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Edit Summary - only show if comment exists */}
                    {revision.comment && (
                        <div className="space-y-2">
                            <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                                <MessageSquare size={12} />
                                Edit Summary
                            </h2>
                            <div 
                                className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg backdrop-blur-sm"
                            >
                                <p className="text-white/80 text-sm leading-relaxed">
                                    <span className="italic">&ldquo;{revision.comment}&rdquo;</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Edit Type & Tags */}
                    <div className="space-y-2">
                        <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                            <Tag size={12} />
                            Edit Type
                        </h2>
                        <div 
                            className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg backdrop-blur-sm"
                        >
                            <div className="flex flex-wrap gap-2">
                                {/* Minor/Major edit badge */}
                                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                    revision.minor 
                                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                    {revision.minor ? 'Minor' : 'Major'}
                                </span>
                                
                                {/* Anonymous badge */}
                                {isAnonymous && (
                                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                        Anonymous
                                    </span>
                                )}
                                
                                {/* Tags */}
                                {revision.tags && revision.tags.length > 0 && revision.tags.map((tag, idx) => (
                                    <span 
                                        key={idx}
                                        className={`px-2 py-1 rounded-full text-[10px] font-medium tracking-wider ${
                                            getTagStyle(tag)
                                        }`}
                                    >
                                        {formatTagName(tag)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Technical Details */}
                    <div className="space-y-2">
                        <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                            <Hash size={12} />
                            Technical Details
                        </h2>
                        <div 
                            className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg backdrop-blur-sm space-y-3"
                        >
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/40 flex items-center gap-2">
                                    <Info size={12} className="text-purple-400" /> 
                                    Revision ID
                                </span>
                                <a 
                                    href={`https://en.wikipedia.org/w/index.php?oldid=${revision.revid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/80 font-mono bg-white/5 px-2 py-0.5 rounded hover:bg-blue-500/20 hover:text-blue-300 transition-colors flex items-center gap-1 group"
                                >
                                    {revision.revid}
                                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/40 flex items-center gap-2">
                                    <Info size={12} className="text-blue-400" /> 
                                    Parent ID
                                </span>
                                {revision.parentid ? (
                                    <a 
                                        href={`https://en.wikipedia.org/w/index.php?oldid=${revision.parentid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/80 font-mono bg-white/5 px-2 py-0.5 rounded hover:bg-blue-500/20 hover:text-blue-300 transition-colors flex items-center gap-1 group"
                                    >
                                        {revision.parentid}
                                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                ) : (
                                    <span className="text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded">None</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 mt-auto pt-4 border-t border-white/10">
                        <h2 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold">Legend</h2>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded bg-emerald-500/25 border border-emerald-400/40" />
                                <span className="text-emerald-300">Added text</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded bg-rose-500/20 border border-rose-400/20" />
                                <span className="text-rose-300/60 line-through">Removed text</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
