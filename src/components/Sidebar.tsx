
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Revision, isIPAddress, fetchIPGeolocation, GeoLocation } from '@/lib/wikiApi';
import { format } from 'date-fns';
import { User, Globe, Loader2, Tag } from 'lucide-react';

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
        <div className="w-full h-full flex flex-col gap-4 p-5 bg-[#09090b]">
            <div className="animate-pulse flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-white/[0.04] rounded-xl" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col gap-4 p-5 bg-[#09090b] overflow-y-auto custom-scrollbar">
            {/* Total Revisions */}
            {totalRevisions > 0 && (
                <div className="pb-4 border-b border-white/[0.06]">
                    <div className="text-2xl font-bold text-white">{totalRevisions.toLocaleString()}</div>
                    <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider mt-1">Total Revisions</div>
                </div>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={revision.revid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                >
                    {/* Editor Info */}
                    <div className="space-y-3">
                        <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Editor</div>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                isAnonymous 
                                    ? 'bg-orange-500/10 text-orange-400' 
                                    : 'bg-blue-500/10 text-blue-400'
                            }`}>
                                {isAnonymous ? <Globe size={16} /> : <User size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <a 
                                        href={isAnonymous 
                                            ? `https://en.wikipedia.org/wiki/Special:Contributions/${revision.user}`
                                            : `https://en.wikipedia.org/wiki/User:${encodeURIComponent(revision.user)}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-white hover:text-blue-400 transition-colors truncate"
                                    >
                                        {isAnonymous ? 'Anonymous' : revision.user}
                                    </a>
                                    {isAnonymous && !isLoadingGeo && geoLocation && (
                                        <span className="text-sm" title={`${geoLocation.city ? geoLocation.city + ', ' : ''}${geoLocation.country}`}>
                                            {getCountryFlag(geoLocation.countryCode)}
                                        </span>
                                    )}
                                </div>
                                {isAnonymous && (
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-white/30 font-mono">{revision.user}</span>
                                        {isLoadingGeo && <Loader2 size={10} className="animate-spin text-white/30" />}
                                        {!isLoadingGeo && geoLocation && (
                                            <span className="text-[10px] text-white/30">
                                                {[geoLocation.city, geoLocation.country].filter(Boolean).join(', ')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Date</div>
                        <div className="text-sm text-white/80">
                            {format(new Date(revision.timestamp), 'MMMM d, yyyy')}
                            <span className="text-white/40 ml-2">{format(new Date(revision.timestamp), 'HH:mm')}</span>
                        </div>
                    </div>

                    {/* Edit Summary */}
                    {revision.comment && (
                        <div className="space-y-2">
                            <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Summary</div>
                            <p className="text-sm text-white/60 leading-relaxed">
                                {revision.comment}
                            </p>
                        </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-2">
                        <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Type</div>
                        <div className="flex flex-wrap gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                revision.minor 
                                    ? 'bg-amber-500/10 text-amber-400' 
                                    : 'bg-blue-500/10 text-blue-400'
                            }`}>
                                {revision.minor ? 'Minor' : 'Major'}
                            </span>
                            
                            {isAnonymous && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400">
                                    Anonymous
                                </span>
                            )}
                            
                            {revision.tags && revision.tags.length > 0 && revision.tags.map((tag, idx) => (
                                <span 
                                    key={idx}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${getTagStyle(tag)}`}
                                >
                                    {formatTagName(tag)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Technical */}
                    <div className="space-y-2 pt-4 border-t border-white/[0.06]">
                        <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Technical</div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-white/30">Revision ID</span>
                                <a 
                                    href={`https://en.wikipedia.org/w/index.php?oldid=${revision.revid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/60 font-mono hover:text-blue-400 transition-colors"
                                >
                                    {revision.revid}
                                </a>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/30">Parent ID</span>
                                {revision.parentid ? (
                                    <a 
                                        href={`https://en.wikipedia.org/w/index.php?oldid=${revision.parentid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/60 font-mono hover:text-blue-400 transition-colors"
                                    >
                                        {revision.parentid}
                                    </a>
                                ) : (
                                    <span className="text-white/30 font-mono">—</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 pt-4 border-t border-white/[0.06]">
                        <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Legend</div>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-emerald-500/20" />
                                <span className="text-emerald-400/80">Added</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-red-500/15" />
                                <span className="text-red-400/60 line-through">Removed</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
