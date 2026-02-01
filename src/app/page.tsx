
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRevisionHistory, fetchRevisionContent, fetchRandomArticle, fetchRevisionExternalLinks, Revision, isIPAddress, RevisionProgress } from '@/lib/wikiApi';
import { calculateDiff, ExtendedChange, extractInfoboxes, InfoboxData } from '@/lib/diffUtils';
import { TimelineSlider } from '@/components/TimelineSlider';
import { DiffViewer } from '@/components/DiffViewer';
import { Sidebar } from '@/components/Sidebar';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { preloadMarkdownRenderer } from '@/components/MarkdownRenderer';
import { Loader2, History, Github, Menu, X, Settings } from 'lucide-react';

type HighlightIntensity = 'subtle' | 'vivid' | 'flat';
type ViewStyle = 'inline' | 'split';
type ViewMode = 'clean' | 'balanced' | 'detail';
const minRevisionLimit = 500;
const maxRevisionLimit = 50000;

type ViewerSettings = {
  showLinks: boolean;
  showReferences: boolean;
  showTemplates: boolean;
  showImages: boolean;
  highlightIntensity: HighlightIntensity;
  viewStyle: ViewStyle;
  autoScroll: boolean;
  autoPlay: boolean;
  fontSize: number;
  lineHeight: number;
  maxRevisions: number;
  playbackSpeed: number;
  includeMinor: boolean;
  includeBots: boolean;
  includeAnonymous: boolean;
  dateFrom: string;
  dateTo: string;
  editRangeStart: number | null;
  editRangeEnd: number | null;
};

type ViewModeSettings = Pick<
  ViewerSettings,
  | 'showLinks'
  | 'showReferences'
  | 'showTemplates'
  | 'showImages'
  | 'highlightIntensity'
  | 'viewStyle'
  | 'autoScroll'
  | 'fontSize'
  | 'lineHeight'
>;

type StoredViewerSettings = {
  version: number;
  data: Partial<ViewerSettings>;
};

const defaultViewerSettings: ViewerSettings = {
  showLinks: false,
  showReferences: false,
  showTemplates: false,
  showImages: false,
  highlightIntensity: 'subtle',
  viewStyle: 'inline',
  autoScroll: true,
  autoPlay: true,
  fontSize: 16,
  lineHeight: 1.9,
  maxRevisions: 50000,
  playbackSpeed: 1,
  includeMinor: true,
  includeBots: true,
  includeAnonymous: true,
  dateFrom: '',
  dateTo: '',
  editRangeStart: null,
  editRangeEnd: null,
};

const viewerSettingsSchemaVersion = 2;
const viewerSettingsStorageKey = 'wikireplay:viewerSettings';
const viewerSettingsMigratedKey = 'wikireplay:viewerSettings:migrated';

let cachedViewerSettings: StoredViewerSettings | null | undefined;
let cachedMigratedVersion: number | null | undefined;

const viewModes: Record<ViewMode, ViewModeSettings> = {
  clean: {
    showLinks: false,
    showReferences: false,
    showTemplates: false,
    showImages: false,
    highlightIntensity: 'flat',
    viewStyle: 'inline',
    autoScroll: true,
    fontSize: 16,
    lineHeight: 1.9,
  },
  balanced: defaultViewerSettings,
  detail: {
    showLinks: true,
    showReferences: true,
    showTemplates: true,
    showImages: true,
    highlightIntensity: 'vivid',
    viewStyle: 'split',
    autoScroll: true,
    fontSize: 15,
    lineHeight: 1.8,
  },
};

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
};

const parseEditRangeValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.floor(num);
};

const parseDateInput = (value: string, endOfDay = false): Date | null => {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00';
  const parsed = new Date(`${value}${suffix}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const isBotRevision = (revision: Revision) => {
  if (revision.tags?.some((tag) => tag.toLowerCase().includes('bot'))) return true;
  return /bot$/i.test(revision.user);
};

const externalLinksHeadingRegex = /^==\s*External links\s*==\s*$/im;

const buildExternalLinksList = (links: string[]) => links.map((url) => `* ${url}`).join('\n');

const injectExternalLinks = (text: string, links: string[] | undefined, enabled: boolean) => {
  if (!enabled || !text || !links?.length) return text;
  const list = buildExternalLinksList(links);
  const match = externalLinksHeadingRegex.exec(text);

  if (!match) {
    return `${text.trimEnd()}\n\n==External links==\n${list}\n`;
  }

  const headingLineEnd = text.indexOf('\n', match.index);
  const insertPos = headingLineEnd === -1 ? text.length : headingLineEnd + 1;
  const afterHeading = text.slice(insertPos);
  const nextHeading = afterHeading.match(/^\s*==[^=].*==\s*$/m);
  const sectionBody = nextHeading ? afterHeading.slice(0, nextHeading.index) : afterHeading;
  const hasLinks = /https?:\/\//i.test(sectionBody);
  if (hasLinks) return text;

  const prefix = text.slice(0, insertPos).replace(/\n*$/, '\n');
  const suffix = nextHeading ? afterHeading.slice(nextHeading.index) : '';
  return `${prefix}\n${list}\n\n${suffix}`.trimEnd();
};

const isSettingsMatch = (a: ViewModeSettings, b: ViewModeSettings) =>
  a.showLinks === b.showLinks &&
  a.showReferences === b.showReferences &&
  a.showTemplates === b.showTemplates &&
  a.showImages === b.showImages &&
  a.highlightIntensity === b.highlightIntensity &&
  a.viewStyle === b.viewStyle &&
  a.autoScroll === b.autoScroll &&
  a.fontSize === b.fontSize &&
  a.lineHeight === b.lineHeight;

const readMigratedVersion = () => {
  if (cachedMigratedVersion !== undefined) return cachedMigratedVersion;
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(viewerSettingsMigratedKey);
  const parsed = raw ? Number(raw) : null;
  cachedMigratedVersion = Number.isFinite(parsed) ? parsed : null;
  return cachedMigratedVersion;
};

const readStoredViewerSettings = () => {
  if (cachedViewerSettings !== undefined) return cachedViewerSettings;
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(viewerSettingsStorageKey);
  if (!raw) {
    cachedViewerSettings = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredViewerSettings;
    cachedViewerSettings = parsed;
    return parsed;
  } catch {
    cachedViewerSettings = null;
    return null;
  }
};

const updateStoredViewerSettingsCache = (settings: StoredViewerSettings) => {
  cachedViewerSettings = settings;
  cachedMigratedVersion = settings.version;
};

export default function Home() {
  const [title, setTitle] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [diff, setDiff] = useState<ExtendedChange[]>([]);
  const [infoboxes, setInfoboxes] = useState<InfoboxData[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<RevisionProgress | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLinks, setShowLinks] = useState(defaultViewerSettings.showLinks);
  const [showReferences, setShowReferences] = useState(defaultViewerSettings.showReferences);
  const [showTemplates, setShowTemplates] = useState(defaultViewerSettings.showTemplates);
  const [showImages, setShowImages] = useState(defaultViewerSettings.showImages);
  const [highlightIntensity, setHighlightIntensity] = useState<HighlightIntensity>(defaultViewerSettings.highlightIntensity);
  const [viewStyle, setViewStyle] = useState<ViewStyle>(defaultViewerSettings.viewStyle);
  const [autoScroll, setAutoScroll] = useState(defaultViewerSettings.autoScroll);
  const [autoPlay, setAutoPlay] = useState(defaultViewerSettings.autoPlay);
  const [fontSize, setFontSize] = useState(defaultViewerSettings.fontSize);
  const [lineHeight, setLineHeight] = useState(defaultViewerSettings.lineHeight);
  const [maxRevisions, setMaxRevisions] = useState(defaultViewerSettings.maxRevisions);
  const [playbackSpeed, setPlaybackSpeed] = useState(defaultViewerSettings.playbackSpeed);
  const [includeMinor, setIncludeMinor] = useState(defaultViewerSettings.includeMinor);
  const [includeBots, setIncludeBots] = useState(defaultViewerSettings.includeBots);
  const [includeAnonymous, setIncludeAnonymous] = useState(defaultViewerSettings.includeAnonymous);
  const [dateFrom, setDateFrom] = useState(defaultViewerSettings.dateFrom);
  const [dateTo, setDateTo] = useState(defaultViewerSettings.dateTo);
  const [editRangeStart, setEditRangeStart] = useState<number | null>(defaultViewerSettings.editRangeStart);
  const [editRangeEnd, setEditRangeEnd] = useState<number | null>(defaultViewerSettings.editRangeEnd);
  const [isTitleLoading, setIsTitleLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const settingsRef = useRef<HTMLDivElement>(null);
  const scrollToChangeRef = useRef<(() => void) | null>(null);
  const fullHistoryRef = useRef<Revision[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // Load article from URL or fetch random on initial mount
  useEffect(() => {
    const loadInitialArticle = async () => {
      // Check if there's an article in the URL path (e.g., /World_War_II)
      const pathArticle = pathname && pathname !== '/' ? decodeURIComponent(pathname.slice(1)) : null;
      
      if (pathArticle) {
        // Load article from URL
        setTitle(pathArticle);
        setSearchInput(pathArticle);
      } else {
        // No article in URL, load random
        try {
          const randomTitle = await fetchRandomArticle();
          setTitle(randomTitle);
          setSearchInput(randomTitle);
          // Update URL without reload
          window.history.replaceState(null, '', `/${encodeURIComponent(randomTitle)}`);
        } catch {
          // Fallback to a default article if random fetch fails
          setTitle('Wikipedia');
          setSearchInput('Wikipedia');
          window.history.replaceState(null, '', '/Wikipedia');
        }
      }
    };
    loadInitialArticle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    preloadMarkdownRenderer();
  }, []);

  const applyViewerSettings = useCallback(
    (settings: Partial<ViewerSettings>, options?: { useDefaults?: boolean }) => {
      const useDefaults = options?.useDefaults ?? false;
      const getFallback = <T,>(prev: T, fallback: T) => (useDefaults ? fallback : prev);

      setShowLinks((prev) => settings.showLinks ?? getFallback(prev, defaultViewerSettings.showLinks));
      setShowReferences((prev) => settings.showReferences ?? getFallback(prev, defaultViewerSettings.showReferences));
      setShowTemplates((prev) => settings.showTemplates ?? getFallback(prev, defaultViewerSettings.showTemplates));
      setShowImages((prev) => settings.showImages ?? getFallback(prev, defaultViewerSettings.showImages));
      setHighlightIntensity((prev) => settings.highlightIntensity ?? getFallback(prev, defaultViewerSettings.highlightIntensity));
      setViewStyle((prev) => {
        const fallback = getFallback(prev, defaultViewerSettings.viewStyle);
        return settings.viewStyle === 'inline' || settings.viewStyle === 'split'
          ? settings.viewStyle
          : fallback;
      });
      setAutoScroll((prev) => settings.autoScroll ?? getFallback(prev, defaultViewerSettings.autoScroll));
      setAutoPlay((prev) => settings.autoPlay ?? getFallback(prev, defaultViewerSettings.autoPlay));
      setFontSize((prev) => {
        const fallback = getFallback(prev, defaultViewerSettings.fontSize);
        return clampNumber(settings.fontSize ?? fallback, 12, 20, fallback);
      });
      setLineHeight((prev) => {
        const fallback = getFallback(prev, defaultViewerSettings.lineHeight);
        return clampNumber(settings.lineHeight ?? fallback, 1.4, 2.2, fallback);
      });
      setMaxRevisions((prev) => {
        const fallback = getFallback(prev, defaultViewerSettings.maxRevisions);
        return clampNumber(settings.maxRevisions ?? fallback, minRevisionLimit, maxRevisionLimit, fallback);
      });
      setPlaybackSpeed((prev) => {
        const fallback = getFallback(prev, defaultViewerSettings.playbackSpeed);
        return clampNumber(settings.playbackSpeed ?? fallback, 0.5, 3, fallback);
      });
      setIncludeMinor((prev) => settings.includeMinor ?? getFallback(prev, defaultViewerSettings.includeMinor));
      setIncludeBots((prev) => settings.includeBots ?? getFallback(prev, defaultViewerSettings.includeBots));
      setIncludeAnonymous((prev) => settings.includeAnonymous ?? getFallback(prev, defaultViewerSettings.includeAnonymous));
      setDateFrom((prev) => (typeof settings.dateFrom === 'string' ? settings.dateFrom : getFallback(prev, defaultViewerSettings.dateFrom)));
      setDateTo((prev) => (typeof settings.dateTo === 'string' ? settings.dateTo : getFallback(prev, defaultViewerSettings.dateTo)));
      setEditRangeStart((prev) => {
        if (settings.editRangeStart !== undefined) {
          return parseEditRangeValue(settings.editRangeStart);
        }
        return getFallback(prev, defaultViewerSettings.editRangeStart);
      });
      setEditRangeEnd((prev) => {
        if (settings.editRangeEnd !== undefined) {
          return parseEditRangeValue(settings.editRangeEnd);
        }
        return getFallback(prev, defaultViewerSettings.editRangeEnd);
      });
    },
    []
  );

  useEffect(() => {
    const storedSettings = readStoredViewerSettings();
    const migratedVersion = readMigratedVersion();
    if (storedSettings) {
      const settingsData =
        storedSettings.data && typeof storedSettings.data === 'object'
          ? storedSettings.data
          : (storedSettings as Partial<ViewerSettings>);
      applyViewerSettings({
        showLinks: typeof settingsData.showLinks === 'boolean' ? settingsData.showLinks : undefined,
        showReferences: typeof settingsData.showReferences === 'boolean' ? settingsData.showReferences : undefined,
        showTemplates: typeof settingsData.showTemplates === 'boolean' ? settingsData.showTemplates : undefined,
        showImages: typeof settingsData.showImages === 'boolean' ? settingsData.showImages : undefined,
        highlightIntensity:
          settingsData.highlightIntensity === 'subtle' ||
          settingsData.highlightIntensity === 'vivid' ||
          settingsData.highlightIntensity === 'flat'
            ? settingsData.highlightIntensity
            : undefined,
        viewStyle:
          settingsData.viewStyle === 'inline' || settingsData.viewStyle === 'split'
            ? settingsData.viewStyle
            : undefined,
        autoScroll: typeof settingsData.autoScroll === 'boolean' ? settingsData.autoScroll : undefined,
        autoPlay: typeof settingsData.autoPlay === 'boolean' ? settingsData.autoPlay : undefined,
        fontSize: settingsData.fontSize,
        lineHeight: settingsData.lineHeight,
        maxRevisions: settingsData.maxRevisions,
        playbackSpeed: settingsData.playbackSpeed,
        includeMinor: typeof settingsData.includeMinor === 'boolean' ? settingsData.includeMinor : undefined,
        includeBots: typeof settingsData.includeBots === 'boolean' ? settingsData.includeBots : undefined,
        includeAnonymous:
          typeof settingsData.includeAnonymous === 'boolean' ? settingsData.includeAnonymous : undefined,
        dateFrom: typeof settingsData.dateFrom === 'string' ? settingsData.dateFrom : undefined,
        dateTo: typeof settingsData.dateTo === 'string' ? settingsData.dateTo : undefined,
        editRangeStart: settingsData.editRangeStart,
        editRangeEnd: settingsData.editRangeEnd,
      }, { useDefaults: true });
      if (migratedVersion !== viewerSettingsSchemaVersion) {
        localStorage.setItem(viewerSettingsMigratedKey, String(viewerSettingsSchemaVersion));
        cachedMigratedVersion = viewerSettingsSchemaVersion;
      }
      return;
    }

    const legacyShowLinks = localStorage.getItem('wikireplay:showLinks');
    if (legacyShowLinks !== null) {
      applyViewerSettings({ showLinks: legacyShowLinks === 'true' });
    }
  }, [applyViewerSettings]);

  useEffect(() => {
    const payload: StoredViewerSettings = {
      version: viewerSettingsSchemaVersion,
      data: {
        showLinks,
        showReferences,
        showTemplates,
        showImages,
        highlightIntensity,
        viewStyle,
        autoScroll,
        autoPlay,
        fontSize,
        lineHeight,
        maxRevisions,
        playbackSpeed,
        includeMinor,
        includeBots,
        includeAnonymous,
        dateFrom,
        dateTo,
        editRangeStart,
        editRangeEnd,
      },
    };
    localStorage.setItem(viewerSettingsStorageKey, JSON.stringify(payload));
    localStorage.setItem(viewerSettingsMigratedKey, String(viewerSettingsSchemaVersion));
    updateStoredViewerSettingsCache(payload);
  }, [
    showLinks,
    showReferences,
    showTemplates,
    showImages,
    highlightIntensity,
    viewStyle,
    autoScroll,
    autoPlay,
    fontSize,
    lineHeight,
    maxRevisions,
    playbackSpeed,
    includeMinor,
    includeBots,
    includeAnonymous,
    dateFrom,
    dateTo,
    editRangeStart,
    editRangeEnd,
  ]);

  const initialHistoryLimit = Math.min(minRevisionLimit, maxRevisions);
  const initialHistoryKey = title ? ['history-initial', title, initialHistoryLimit] : null;
  const { data: initialHistory, isLoading: isInitialHistoryLoading, error: historyError } = useSWR(
    initialHistoryKey,
    () => {
      setLoadingProgress(null);
      return fetchRevisionHistory(title ?? '', initialHistoryLimit, false, (progress) => {
        setLoadingProgress(progress);
      });
    },
    { revalidateOnFocus: false }
  );

  const shouldFetchFullHistory = Boolean(initialHistory && maxRevisions > initialHistoryLimit);
  const { data: fullHistory } = useSWR(
    shouldFetchFullHistory ? ['history-full', title, maxRevisions] : null,
    () => {
      return fetchRevisionHistory(title ?? '', maxRevisions, true, (progress) => {
        if (progress.batch?.length) {
          fullHistoryRef.current = [...fullHistoryRef.current, ...progress.batch];
          setRevisions(fullHistoryRef.current);
        }
      });
    },
    { revalidateOnFocus: false }
  );

  const filteredRevisions = useMemo(() => {
    if (!revisions.length) return [];
    let list = revisions;

    if (!includeMinor) {
      list = list.filter((revision) => !revision.minor);
    }
    if (!includeAnonymous) {
      list = list.filter((revision) => !isIPAddress(revision.user));
    }
    if (!includeBots) {
      list = list.filter((revision) => !isBotRevision(revision));
    }

    const startDate = parseDateInput(dateFrom);
    const endDate = parseDateInput(dateTo, true);
    if (startDate || endDate) {
      const startTime = startDate ? startDate.getTime() : Number.NEGATIVE_INFINITY;
      const endTime = endDate ? endDate.getTime() : Number.POSITIVE_INFINITY;
      const minTime = Math.min(startTime, endTime);
      const maxTime = Math.max(startTime, endTime);
      list = list.filter((revision) => {
        const revisionTime = new Date(revision.timestamp).getTime();
        return revisionTime >= minTime && revisionTime <= maxTime;
      });
    }

    if (!list.length) return list;

    const total = list.length;
    let startIndex = editRangeStart ? Math.min(total, Math.max(1, editRangeStart)) : 1;
    let endIndex = editRangeEnd ? Math.min(total, Math.max(1, editRangeEnd)) : total;
    if (startIndex > endIndex) {
      [startIndex, endIndex] = [endIndex, startIndex];
    }

    if (startIndex !== 1 || endIndex !== total) {
      list = list.slice(startIndex - 1, endIndex);
    }

    return list;
  }, [
    revisions,
    includeMinor,
    includeAnonymous,
    includeBots,
    dateFrom,
    dateTo,
    editRangeStart,
    editRangeEnd,
  ]);

  const currentRevision = filteredRevisions[currentIndex];
  const prevRevision = filteredRevisions[currentIndex - 1];

  const { data: currentContent, isLoading: isCurrentContentLoading } = useSWR(
    currentRevision ? ['revision', currentRevision.revid] : null,
    () => fetchRevisionContent(currentRevision!.revid),
    { revalidateOnFocus: false }
  );

  const { data: prevContent, isLoading: isPrevContentLoading } = useSWR(
    prevRevision ? ['revision', prevRevision.revid] : null,
    () => fetchRevisionContent(prevRevision!.revid),
    { revalidateOnFocus: false }
  );

  const shouldFetchExternalLinks = showTemplates;
  const { data: currentExternalLinks } = useSWR(
    shouldFetchExternalLinks && currentRevision ? ['externallinks', currentRevision.revid] : null,
    () => fetchRevisionExternalLinks(currentRevision!.revid),
    { revalidateOnFocus: false }
  );

  const { data: prevExternalLinks } = useSWR(
    shouldFetchExternalLinks && prevRevision ? ['externallinks', prevRevision.revid] : null,
    () => fetchRevisionExternalLinks(prevRevision!.revid),
    { revalidateOnFocus: false }
  );

  const currentSettings = useMemo<ViewModeSettings>(
    () => ({
      showLinks,
      showReferences,
      showTemplates,
      showImages,
      highlightIntensity,
      viewStyle,
      autoScroll,
      fontSize,
      lineHeight,
    }),
    [
      showLinks,
      showReferences,
      showTemplates,
      showImages,
      highlightIntensity,
      viewStyle,
      autoScroll,
      fontSize,
      lineHeight,
    ]
  );

  const activePreset = useMemo(() => {
    const entries = Object.entries(viewModes) as [ViewMode, ViewModeSettings][];
    const match = entries.find(([, preset]) => isSettingsMatch(preset, currentSettings));
    return match?.[0] ?? null;
  }, [currentSettings]);

  useOnClickOutside(settingsRef, () => setSettingsOpen(false), settingsOpen);

  useEffect(() => {
    setError(null);
    setDiff([]);
    setRevisions([]);
    setCurrentIndex(0);
    setIsTransitioning(false);
    setLoadingProgress(null);
    fullHistoryRef.current = [];
  }, [title, maxRevisions]);

  useEffect(() => {
    if (!initialHistory) return;
    setRevisions(initialHistory);
    setCurrentIndex(0);
  }, [initialHistory, title]);

  useEffect(() => {
    if (!fullHistory || fullHistory.length <= revisions.length) return;
    const currentRevid = currentRevision?.revid;
    setRevisions(fullHistory);
    if (!currentRevid) {
      setCurrentIndex(0);
      return;
    }
    const nextIndex = fullHistory.findIndex((rev) => rev.revid === currentRevid);
    setCurrentIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [fullHistory, revisions.length, currentRevision?.revid]);

  useEffect(() => {
    if (filteredRevisions.length === 0) {
      setCurrentIndex(0);
      return;
    }
    if (currentIndex >= filteredRevisions.length) {
      setCurrentIndex(filteredRevisions.length - 1);
    }
  }, [filteredRevisions.length, currentIndex]);

  useEffect(() => {
    if (!historyError) return;
    setError(historyError instanceof Error ? historyError.message : 'An error occurred');
  }, [historyError]);

  const isBusy = isPending || isTitleLoading || isInitialHistoryLoading || isCurrentContentLoading || (prevRevision ? isPrevContentLoading : false);

  const handleRevisionChange = useCallback((index: number) => {
    if (index === currentIndex || isBusy) return;
    setIsTransitioning(true);
    startTransition(() => setCurrentIndex(index));
  }, [currentIndex, isBusy, startTransition]);

  const handleScrollToChange = useCallback((scrollFn: () => void) => {
    scrollToChangeRef.current = scrollFn;
  }, []);

  useEffect(() => {
    if (!currentRevision) {
      setDiff([]);
      setInfoboxes([]);
      return;
    }
    if (!currentContent) return;
    if (prevRevision && !prevContent) return;

    const prevSource = injectExternalLinks(prevContent ?? '', prevExternalLinks, showTemplates);
    const currentSource = injectExternalLinks(currentContent, currentExternalLinks, showTemplates);
    
    // Extract infoboxes from the current content if templates are enabled
    const extractedInfoboxes = showTemplates ? extractInfoboxes(currentContent) : [];
    
    const newDiff = calculateDiff(prevSource, currentSource, {
      granularity: 'sentence',
      contentFilters: {
        showReferences,
        showTemplates,
        showImages,
      },
    });
    startTransition(() => {
      setDiff(newDiff);
      setInfoboxes(extractedInfoboxes);
    });

    const finalizeScroll = () => {
      if (autoScroll && scrollToChangeRef.current) {
        scrollToChangeRef.current();
      }
    };

    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setTimeout(finalizeScroll, 200);
      }, 50);
      return () => clearTimeout(timer);
    }

    finalizeScroll();
  }, [
    currentRevision,
    currentContent,
    prevRevision,
    prevContent,
    prevExternalLinks,
    showReferences,
    showTemplates,
    showImages,
    currentExternalLinks,
    autoScroll,
    isTransitioning,
    startTransition,
  ]);

  const handleSelectArticle = (articleTitle: string) => {
    if (articleTitle.trim() && articleTitle.trim() !== title) {
      const newTitle = articleTitle.trim();
      setTitle(newTitle);
      // Update URL to reflect the new article
      window.history.pushState(null, '', `/${encodeURIComponent(newTitle)}`);
    }
  };

  const handleRandomArticle = async () => {
    try {
      setIsTitleLoading(true);
      const randomTitle = await fetchRandomArticle();
      setSearchInput(randomTitle);
      setTitle(randomTitle);
      // Update URL to reflect the new article
      window.history.pushState(null, '', `/${encodeURIComponent(randomTitle)}`);
    } catch {
      setError('Failed to fetch random article');
    } finally {
      setIsTitleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-14 md:h-16 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-50 flex items-center px-4 md:px-6 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 md:gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <History className="text-white" size={14} />
          </div>
          <span className="text-sm md:text-[15px] font-semibold tracking-tight hidden sm:block">
            WikiReplay
          </span>
        </Link>

        {/* Search - centered on desktop, flex-1 on mobile */}
        <div className="flex-1 flex justify-center mx-3 md:mx-6 lg:mr-[340px]">
          <div className="w-full max-w-md">
            <SearchAutocomplete
              value={searchInput}
              onChange={setSearchInput}
              onSelect={handleSelectArticle}
              onRandom={handleRandomArticle}
              placeholder="Search Wikipedia..."
            />
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/sensahin/WikiReplay"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            title="View on GitHub"
          >
            <Github size={18} />
          </a>

          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setSettingsOpen((open) => !open)}
              onMouseEnter={preloadMarkdownRenderer}
              onFocus={preloadMarkdownRenderer}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 max-h-[75vh] overflow-y-auto pr-1 rounded-lg border border-white/[0.08] bg-[#131316] shadow-xl p-3 z-50"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">View mode</div>
                      <div className="flex items-center gap-1.5">
                        {(['clean', 'balanced', 'detail'] as ViewMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => applyViewerSettings(viewModes[mode])}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                              activePreset === mode
                                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                : 'bg-white/[0.06] text-white/60 border border-white/[0.08] hover:text-white'
                            }`}
                            aria-pressed={activePreset === mode}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Layout</div>
                      <div className="flex items-center gap-1.5">
                        {(['inline', 'split'] as ViewStyle[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setViewStyle(option)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                              viewStyle === option
                                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                : 'bg-white/[0.06] text-white/60 border border-white/[0.08] hover:text-white'
                            }`}
                            aria-pressed={viewStyle === option}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Diff</div>
                      <div className="flex items-center gap-1.5">
                        {(['subtle', 'vivid', 'flat'] as HighlightIntensity[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setHighlightIntensity(option)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                              highlightIntensity === option
                                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                : 'bg-white/[0.06] text-white/60 border border-white/[0.08] hover:text-white'
                            }`}
                            aria-pressed={highlightIntensity === option}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Content</div>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Show links</span>
                        <button
                          type="button"
                          onClick={() => setShowLinks((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            showLinks ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={showLinks}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              showLinks ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Show references</span>
                        <button
                          type="button"
                          onClick={() => setShowReferences((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            showReferences ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={showReferences}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              showReferences ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Show templates + categories</span>
                        <button
                          type="button"
                          onClick={() => setShowTemplates((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            showTemplates ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={showTemplates}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              showTemplates ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Show images</span>
                        <button
                          type="button"
                          onClick={() => setShowImages((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            showImages ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={showImages}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              showImages ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Behavior</div>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Auto-scroll</span>
                        <button
                          type="button"
                          onClick={() => setAutoScroll((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            autoScroll ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={autoScroll}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              autoScroll ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Autoplay on load</span>
                        <button
                          type="button"
                          onClick={() => setAutoPlay((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            autoPlay ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={autoPlay}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              autoPlay ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Playback</div>
                      <div className="flex items-center gap-1.5">
                        {[0.5, 1, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                              playbackSpeed === speed
                                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                : 'bg-white/[0.06] text-white/60 border border-white/[0.08] hover:text-white'
                            }`}
                            aria-pressed={playbackSpeed === speed}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Filters</div>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Include minor</span>
                        <button
                          type="button"
                          onClick={() => setIncludeMinor((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            includeMinor ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={includeMinor}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              includeMinor ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Include bots</span>
                        <button
                          type="button"
                          onClick={() => setIncludeBots((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            includeBots ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={includeBots}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              includeBots ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Include anonymous</span>
                        <button
                          type="button"
                          onClick={() => setIncludeAnonymous((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            includeAnonymous ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={includeAnonymous}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              includeAnonymous ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">History</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-white/60">
                          <span>Max revisions</span>
                          <span>{maxRevisions.toLocaleString()}</span>
                        </div>
                        <input
                          type="range"
                          min={minRevisionLimit}
                          max={maxRevisionLimit}
                          step={500}
                          value={maxRevisions}
                          onChange={(event) =>
                            setMaxRevisions(
                              Math.round(
                                clampNumber(event.target.value, minRevisionLimit, maxRevisionLimit, defaultViewerSettings.maxRevisions)
                              )
                            )
                          }
                          className="w-full accent-blue-500"
                        />
                        <input
                          type="number"
                          min={minRevisionLimit}
                          max={maxRevisionLimit}
                          step={500}
                          value={maxRevisions}
                          onChange={(event) =>
                            setMaxRevisions(
                              Math.round(
                                clampNumber(event.target.value, minRevisionLimit, maxRevisionLimit, defaultViewerSettings.maxRevisions)
                              )
                            )
                          }
                          className="w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-[11px] text-white/80"
                        />
                        <div className="text-[10px] text-white/40">Higher values load more history but take longer.</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Range</div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1 text-[10px] text-white/50">
                          <span>From</span>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(event) => setDateFrom(event.target.value)}
                            className="w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-[11px] text-white/80"
                          />
                        </label>
                        <label className="space-y-1 text-[10px] text-white/50">
                          <span>To</span>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(event) => setDateTo(event.target.value)}
                            className="w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-[11px] text-white/80"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1 text-[10px] text-white/50">
                          <span>Edit from</span>
                          <input
                            type="number"
                            min={1}
                            value={editRangeStart ?? ''}
                            onChange={(event) => setEditRangeStart(parseEditRangeValue(event.target.value))}
                            className="w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-[11px] text-white/80"
                          />
                        </label>
                        <label className="space-y-1 text-[10px] text-white/50">
                          <span>Edit to</span>
                          <input
                            type="number"
                            min={1}
                            value={editRangeEnd ?? ''}
                            onChange={(event) => setEditRangeEnd(parseEditRangeValue(event.target.value))}
                            className="w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-[11px] text-white/80"
                          />
                        </label>
                      </div>
                      <div className="text-[10px] text-white/40">1 = oldest revision</div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Typography</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-white/60">
                          <span>Font size</span>
                          <span>{fontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={20}
                          step={1}
                          value={fontSize}
                          onChange={(event) => setFontSize(Number(event.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-white/60">
                          <span>Line height</span>
                          <span>{lineHeight.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min={1.4}
                          max={2.2}
                          step={0.1}
                          value={lineHeight}
                          onChange={(event) => setLineHeight(Number(event.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => applyViewerSettings(defaultViewerSettings)}
                        className="w-full px-2 py-1.5 rounded-md text-[11px] font-medium text-white/70 border border-white/[0.1] hover:text-white hover:border-white/30 transition"
                      >
                        Reset defaults
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all lg:hidden"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Article Header */}
          <div className="px-4 md:px-6 lg:px-10 pt-6 md:pt-8 pb-3 md:pb-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
              {title}
            </h1>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto pb-48 md:pb-40 custom-scrollbar">
            <div className="px-4 md:px-6 lg:px-10">
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div 
                  key="error"
                  className="flex flex-col items-center justify-center text-center py-24"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                    <span className="text-red-400 text-lg font-semibold">!</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Article not found</h3>
                  <p className="text-white/40 text-sm max-w-xs">
                    We couldn&apos;t find this Wikipedia article. Check the spelling and try again.
                  </p>
                </motion.div>
              ) : isBusy && diff.length === 0 ? (
                <motion.div 
                  key="loading"
                  className="flex flex-col items-center justify-center py-24"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 className="text-white/40 mb-3 animate-spin" size={32} />
                  <p className="text-white/30 text-sm">
                    {loadingProgress
                      ? `Loading revision history... ${loadingProgress.loaded.toLocaleString()}${
                          loadingProgress.total
                            ? ` / ${loadingProgress.total.toLocaleString()}`
                            : ' loaded'
                        }`
                      : 'Loading revision history...'}
                  </p>
                </motion.div>
              ) : filteredRevisions.length === 0 ? (
                <motion.div
                  key="no-results"
                  className="flex flex-col items-center justify-center text-center py-24"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                    <span className="text-white/50 text-lg font-semibold">∅</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No revisions match</h3>
                  <p className="text-white/40 text-sm max-w-xs">
                    Try loosening the filters or clearing the date/edit ranges.
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <DiffViewer 
                    diff={diff} 
                    infoboxes={infoboxes}
                    isTransitioning={isTransitioning}
                    onScrollToChange={handleScrollToChange}
                    showLinks={showLinks}
                    showImages={showImages}
                    showTemplates={showTemplates}
                    highlightIntensity={highlightIntensity}
                    viewStyle={viewStyle}
                    autoScroll={autoScroll}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                    onArticleClick={handleSelectArticle}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>

          {/* Timeline */}
          <div className="fixed bottom-0 left-0 right-0 lg:right-[340px] z-40">
            <TimelineSlider
              key={`${title ?? 'article'}-${autoPlay ? 'auto' : 'manual'}`}
              revisions={filteredRevisions}
              currentIndex={currentIndex}
              onChange={handleRevisionChange}
              isLoading={isBusy}
              playbackSpeed={playbackSpeed}
              autoPlay={autoPlay}
            />
          </div>
        </div>

        {/* Sidebar - Desktop */}
        <div className="hidden lg:block w-[340px] flex-shrink-0 border-l border-white/[0.06] overflow-y-auto">
          <Sidebar revision={currentRevision} totalRevisions={filteredRevisions.length} currentIndex={currentIndex} />
        </div>

        {/* Sidebar - Mobile Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              />
              {/* Sidebar Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-14 right-0 bottom-0 w-[320px] sm:w-[340px] bg-[#09090b] border-l border-white/[0.06] overflow-y-auto z-50 lg:hidden"
              >
                <Sidebar revision={currentRevision} totalRevisions={filteredRevisions.length} currentIndex={currentIndex} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </main>
  );
}
