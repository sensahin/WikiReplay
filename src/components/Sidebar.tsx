
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Revision, isIPAddress, fetchIPGeolocation, fetchUserInfo, GeoLocation, UserInfo } from '@/lib/wikiApi';
import { format, formatDistanceToNow } from 'date-fns';
import { User, Globe, Loader2, Shield, Bot, Edit3, Calendar } from 'lucide-react';

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
    currentIndex?: number;
}

const SidebarComponent: React.FC<SidebarProps> = ({ revision, totalRevisions = 0, currentIndex = 0 }) => {
    const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isLoadingGeo, setIsLoadingGeo] = useState(false);
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const isAnonymous = revision ? isIPAddress(revision.user) : false;

    // Fetch geolocation for anonymous users
    useEffect(() => {
        let isActive = true;

        const checkAndFetchGeo = async () => {
            if (!revision) {
                if (!isActive) return;
                setGeoLocation(null);
                setIsLoadingGeo(false);
                return;
            }

            if (!isAnonymous) {
                setGeoLocation(null);
                setIsLoadingGeo(false);
                return;
            }

            setIsLoadingGeo(true);
            const geo = await fetchIPGeolocation(revision.user);
            if (!isActive) return;
            setGeoLocation(geo);
            setIsLoadingGeo(false);
        };

        checkAndFetchGeo();
        return () => {
            isActive = false;
        };
    }, [revision, isAnonymous]);

    // Fetch user info for registered users
    useEffect(() => {
        let isActive = true;

        const fetchInfo = async () => {
            if (!revision || isAnonymous) {
                setUserInfo(null);
                setIsLoadingUser(false);
                return;
            }

            setIsLoadingUser(true);
            const info = await fetchUserInfo(revision.user);
            if (!isActive) return;
            setUserInfo(info);
            setIsLoadingUser(false);
        };

        fetchInfo();
        return () => {
            isActive = false;
        };
    }, [revision, isAnonymous]);

    if (!revision) return (
        <div className="w-full h-full flex flex-col gap-4 p-5 bg-[#09090b]">
            <div className="animate-pulse flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-white/[0.04] rounded-xl" />
                ))}
            </div>
        </div>
    );

    // Display position is 1-indexed (currentIndex + 1)
    const displayPosition = currentIndex + 1;

    return (
        <div className="w-full h-full flex flex-col gap-4 p-5 bg-[#09090b] overflow-y-auto custom-scrollbar">
            {/* Revisions Section */}
            {totalRevisions > 0 && (
                <div className="pb-4 border-b border-white/[0.06]">
                    <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider mb-2">Revision</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">{displayPosition.toLocaleString()}</span>
                        <span className="text-lg text-white/40">/</span>
                        <span className="text-lg text-white/50">{totalRevisions.toLocaleString()}</span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs">
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
                        
                        {/* Name row with icon */}
                        <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                                isAnonymous 
                                    ? 'bg-orange-500/10 text-orange-400' 
                                    : userInfo?.groups.some(g => g === 'sysop' || g === 'bureaucrat')
                                        ? 'bg-purple-500/10 text-purple-400'
                                        : userInfo?.groups.includes('bot')
                                            ? 'bg-pink-500/10 text-pink-400'
                                            : 'bg-blue-500/10 text-blue-400'
                            }`}>
                                {isAnonymous ? (
                                    <Globe size={14} />
                                ) : userInfo?.groups.some(g => g === 'sysop' || g === 'bureaucrat') ? (
                                    <Shield size={14} />
                                ) : userInfo?.groups.includes('bot') ? (
                                    <Bot size={14} />
                                ) : (
                                    <User size={14} />
                                )}
                            </div>
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
                            {isAnonymous && (
                                <span className="text-[11px] text-white/40 font-mono">{revision.user}</span>
                            )}
                            {/* User role badges */}
                            {!isAnonymous && userInfo && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {userInfo.groups.some(g => g === 'sysop' || g === 'bureaucrat') && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/20 text-purple-300">
                                            Admin
                                        </span>
                                    )}
                                    {userInfo.groups.includes('bot') && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-pink-500/20 text-pink-300">
                                            Bot
                                        </span>
                                    )}
                                    {userInfo.blocked && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/20 text-red-300" title={userInfo.blockReason}>
                                            Blocked
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Anonymous user location */}
                        {isAnonymous && (
                            <div className="flex items-center gap-2 text-[11px] text-white/40">
                                {isLoadingGeo && <Loader2 size={10} className="animate-spin" />}
                                {!isLoadingGeo && geoLocation && (
                                    <>
                                        <span>{getCountryFlag(geoLocation.countryCode)}</span>
                                        <span>{[geoLocation.city, geoLocation.country].filter(Boolean).join(', ')}</span>
                                    </>
                                )}
                            </div>
                        )}
                        
                        {/* Registered user stats */}
                        {!isAnonymous && (
                            <>
                                {isLoadingUser ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={10} className="animate-spin text-white/30" />
                                        <span className="text-[11px] text-white/30">Loading...</span>
                                    </div>
                                ) : userInfo ? (
                                    <div className="flex items-center gap-3 text-[11px] text-white/50">
                                        <div className="flex items-center gap-1">
                                            <Edit3 size={11} className="text-white/30" />
                                            <span><span className="text-white/70 font-medium">{userInfo.editcount.toLocaleString()}</span> edits</span>
                                        </div>
                                        {userInfo.registration && (
                                            <div className="flex items-center gap-1">
                                                <Calendar size={11} className="text-white/30" />
                                                <span title={format(new Date(userInfo.registration), 'MMMM d, yyyy')}>
                                                    {formatDistanceToNow(new Date(userInfo.registration), { addSuffix: false })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </>
                        )}
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
                            <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Change Summary</div>
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

export const Sidebar = React.memo(SidebarComponent);
