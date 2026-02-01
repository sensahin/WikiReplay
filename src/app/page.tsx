
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRevisionHistory, fetchRevisionContent, fetchRandomArticle, Revision } from '@/lib/wikiApi';
import { calculateDiff, ExtendedChange, DiffGranularity } from '@/lib/diffUtils';
import { TimelineSlider } from '@/components/TimelineSlider';
import { DiffViewer } from '@/components/DiffViewer';
import { Sidebar } from '@/components/Sidebar';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { Loader2, History, Github, Menu, X, Settings } from 'lucide-react';

type HighlightIntensity = 'subtle' | 'vivid' | 'flat';
type ViewMode = 'clean' | 'balanced' | 'detail';

type ViewerSettings = {
  showLinks: boolean;
  diffGranularity: DiffGranularity;
  showRemoved: boolean;
  highlightIntensity: HighlightIntensity;
  autoScroll: boolean;
  fontSize: number;
  lineHeight: number;
};

const defaultViewerSettings: ViewerSettings = {
  showLinks: false,
  diffGranularity: 'word',
  showRemoved: true,
  highlightIntensity: 'subtle',
  autoScroll: true,
  fontSize: 15,
  lineHeight: 1.8,
};

const viewModes: Record<ViewMode, ViewerSettings> = {
  clean: {
    showLinks: false,
    diffGranularity: 'sentence',
    showRemoved: false,
    highlightIntensity: 'flat',
    autoScroll: false,
    fontSize: 16,
    lineHeight: 1.9,
  },
  balanced: defaultViewerSettings,
  detail: {
    showLinks: true,
    diffGranularity: 'word',
    showRemoved: true,
    highlightIntensity: 'vivid',
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

const isSettingsMatch = (a: ViewerSettings, b: ViewerSettings) =>
  a.showLinks === b.showLinks &&
  a.diffGranularity === b.diffGranularity &&
  a.showRemoved === b.showRemoved &&
  a.highlightIntensity === b.highlightIntensity &&
  a.autoScroll === b.autoScroll &&
  a.fontSize === b.fontSize &&
  a.lineHeight === b.lineHeight;

export default function Home() {
  const [title, setTitle] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [diff, setDiff] = useState<ExtendedChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLinks, setShowLinks] = useState(defaultViewerSettings.showLinks);
  const [diffGranularity, setDiffGranularity] = useState<DiffGranularity>(defaultViewerSettings.diffGranularity);
  const [showRemoved, setShowRemoved] = useState(defaultViewerSettings.showRemoved);
  const [highlightIntensity, setHighlightIntensity] = useState<HighlightIntensity>(defaultViewerSettings.highlightIntensity);
  const [autoScroll, setAutoScroll] = useState(defaultViewerSettings.autoScroll);
  const [fontSize, setFontSize] = useState(defaultViewerSettings.fontSize);
  const [lineHeight, setLineHeight] = useState(defaultViewerSettings.lineHeight);
  const settingsRef = useRef<HTMLDivElement>(null);
  const pendingGranularityRef = useRef(false);
  const isLoadingRef = useRef(isLoading);
  const currentIndexRef = useRef(currentIndex);
  const diffGranularityRef = useRef(diffGranularity);
  const loadIdRef = useRef(0);
  const lastAppliedGranularityRef = useRef<DiffGranularity>(diffGranularity);
  const scrollToChangeRef = useRef<(() => void) | null>(null);

  // Load a random article on initial mount
  useEffect(() => {
    const loadRandomArticle = async () => {
      try {
        const randomTitle = await fetchRandomArticle();
        setTitle(randomTitle);
        setSearchInput(randomTitle);
      } catch {
        // Fallback to a default article if random fetch fails
        setTitle('Wikipedia');
        setSearchInput('Wikipedia');
      }
    };
    loadRandomArticle();
  }, []);

  const applyViewerSettings = useCallback((settings: Partial<ViewerSettings>) => {
    setShowLinks(settings.showLinks ?? defaultViewerSettings.showLinks);
    setDiffGranularity(settings.diffGranularity ?? defaultViewerSettings.diffGranularity);
    setShowRemoved(settings.showRemoved ?? defaultViewerSettings.showRemoved);
    setHighlightIntensity(settings.highlightIntensity ?? defaultViewerSettings.highlightIntensity);
    setAutoScroll(settings.autoScroll ?? defaultViewerSettings.autoScroll);
    setFontSize(clampNumber(settings.fontSize, 12, 20, defaultViewerSettings.fontSize));
    setLineHeight(clampNumber(settings.lineHeight, 1.4, 2.2, defaultViewerSettings.lineHeight));
  }, []);

  useEffect(() => {
    const storedValue = localStorage.getItem('wikireplay:viewerSettings');
    if (storedValue) {
      try {
        const parsed = JSON.parse(storedValue) as Partial<{
          showLinks: boolean;
          diffGranularity: DiffGranularity;
          showRemoved: boolean;
          highlightIntensity: HighlightIntensity;
          autoScroll: boolean;
          fontSize: number;
          lineHeight: number;
        }>;
        applyViewerSettings({
          showLinks: typeof parsed.showLinks === 'boolean' ? parsed.showLinks : undefined,
          diffGranularity:
            parsed.diffGranularity === 'word' || parsed.diffGranularity === 'sentence' || parsed.diffGranularity === 'line'
              ? parsed.diffGranularity
              : undefined,
          showRemoved: typeof parsed.showRemoved === 'boolean' ? parsed.showRemoved : undefined,
          highlightIntensity:
            parsed.highlightIntensity === 'subtle' || parsed.highlightIntensity === 'vivid' || parsed.highlightIntensity === 'flat'
              ? parsed.highlightIntensity
              : undefined,
          autoScroll: typeof parsed.autoScroll === 'boolean' ? parsed.autoScroll : undefined,
          fontSize: parsed.fontSize,
          lineHeight: parsed.lineHeight,
        });
        return;
      } catch {
        // fall through to legacy key
      }
    }

    const legacyShowLinks = localStorage.getItem('wikireplay:showLinks');
    if (legacyShowLinks !== null) {
      applyViewerSettings({ showLinks: legacyShowLinks === 'true' });
    }
  }, [applyViewerSettings]);

  useEffect(() => {
    const payload = {
      showLinks,
      diffGranularity,
      showRemoved,
      highlightIntensity,
      autoScroll,
      fontSize,
      lineHeight,
    };
    localStorage.setItem('wikireplay:viewerSettings', JSON.stringify(payload));
  }, [showLinks, diffGranularity, showRemoved, highlightIntensity, autoScroll, fontSize, lineHeight]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    diffGranularityRef.current = diffGranularity;
  }, [diffGranularity]);

  const currentSettings = useMemo(
    () => ({
      showLinks,
      diffGranularity,
      showRemoved,
      highlightIntensity,
      autoScroll,
      fontSize,
      lineHeight,
    }),
    [showLinks, diffGranularity, showRemoved, highlightIntensity, autoScroll, fontSize, lineHeight]
  );

  const activePreset = useMemo(() => {
    const entries = Object.entries(viewModes) as [ViewMode, ViewerSettings][];
    const match = entries.find(([, preset]) => isSettingsMatch(preset, currentSettings));
    return match?.[0] ?? null;
  }, [currentSettings]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [settingsOpen]);

  useEffect(() => {
    if (!title) return;
    const requestId = ++loadIdRef.current;
    let active = true;
    const loadArticle = async () => {
      setIsLoading(true);
      setError(null);
      setDiff([]);
      setRevisions([]);
      setCurrentIndex(0);
      try {
        const history = await fetchRevisionHistory(title, 500, false);
        if (loadIdRef.current !== requestId || !active) return;

        const reversedHistory = [...history].reverse();
        setRevisions(reversedHistory);
        setCurrentIndex(0);

        if (reversedHistory.length > 0) {
          const firstRev = reversedHistory[0];
          const firstContent = await fetchRevisionContent(firstRev.revid);
          if (loadIdRef.current !== requestId || !active) return;
          const newDiff = calculateDiff('', firstContent, diffGranularityRef.current);
          setDiff(newDiff);
        }

        void (async () => {
          try {
            const fullHistory = await fetchRevisionHistory(title, 50000, true);
            if (loadIdRef.current !== requestId || !active) return;
            if (fullHistory.length > history.length) {
              setRevisions([...fullHistory].reverse());
            }
          } catch {
            // background fetch failures should not block initial render
          }
        })();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (loadIdRef.current === requestId && active) {
          setIsLoading(false);
        }
      }
    };
    loadArticle();
    return () => {
      active = false;
    };
  }, [title]);

  const handleRevisionChange = useCallback(async (index: number, options?: { force?: boolean; transition?: boolean }) => {
    const { force = false, transition = true } = options ?? {};
    if ((index === currentIndex && !force) || isLoading) return;

    if (transition) {
      setIsTransitioning(true);
    }
    setIsLoading(true);

    if (transition) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    try {
      const currentRev = revisions[index];
      const prevRev = revisions[index - 1];

      if (!currentRev) {
        setDiff([]);
        if (transition) {
          setIsTransitioning(false);
        }
        return;
      }

      const currentContent = await fetchRevisionContent(currentRev.revid);
      const prevContent = prevRev ? await fetchRevisionContent(prevRev.revid) : '';

      const newDiff = calculateDiff(prevContent, currentContent, diffGranularity);
      setDiff(newDiff);
      setCurrentIndex(index);

      if (transition) {
        setTimeout(() => {
          setIsTransitioning(false);
          setTimeout(() => {
            if (autoScroll && scrollToChangeRef.current) {
              scrollToChangeRef.current();
            }
          }, 200);
        }, 50);
      } else if (autoScroll && scrollToChangeRef.current) {
        scrollToChangeRef.current();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsTransitioning(false);
    } finally {
      setIsLoading(false);
    }
  }, [autoScroll, currentIndex, diffGranularity, isLoading, revisions]);

  const handleScrollToChange = useCallback((scrollFn: () => void) => {
    scrollToChangeRef.current = scrollFn;
  }, []);

  useEffect(() => {
    if (diffGranularity === lastAppliedGranularityRef.current && !pendingGranularityRef.current) {
      return;
    }

    if (revisions.length === 0) {
      pendingGranularityRef.current = true;
      return;
    }
    if (isLoadingRef.current) {
      pendingGranularityRef.current = true;
      return;
    }
    pendingGranularityRef.current = false;
    lastAppliedGranularityRef.current = diffGranularity;
    handleRevisionChange(currentIndexRef.current, { force: true, transition: false });
  }, [diffGranularity, handleRevisionChange, revisions.length]);

  useEffect(() => {
    if (!pendingGranularityRef.current || isLoading || revisions.length === 0) return;
    pendingGranularityRef.current = false;
    lastAppliedGranularityRef.current = diffGranularity;
    handleRevisionChange(currentIndexRef.current, { force: true, transition: false });
  }, [isLoading, revisions.length, handleRevisionChange, diffGranularity]);

  const handleSelectArticle = (articleTitle: string) => {
    if (articleTitle.trim() && articleTitle.trim() !== title) {
      setTitle(articleTitle.trim());
    }
  };

  const handleRandomArticle = async () => {
    try {
      setIsLoading(true);
      const randomTitle = await fetchRandomArticle();
      setSearchInput(randomTitle);
      setTitle(randomTitle);
    } catch {
      setError('Failed to fetch random article');
    } finally {
      setIsLoading(false);
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
                  className="absolute right-0 mt-2 w-64 rounded-lg border border-white/[0.08] bg-[#131316] shadow-xl p-3 z-50"
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
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Diff</div>
                      <div className="flex items-center gap-1.5">
                        {(['word', 'sentence', 'line'] as DiffGranularity[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setDiffGranularity(option)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                              diffGranularity === option
                                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                : 'bg-white/[0.06] text-white/60 border border-white/[0.08] hover:text-white'
                            }`}
                            aria-pressed={diffGranularity === option}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
                        <span>Show removed</span>
                        <button
                          type="button"
                          onClick={() => setShowRemoved((value) => !value)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            showRemoved ? 'bg-blue-500/70' : 'bg-white/[0.15]'
                          }`}
                          aria-pressed={showRemoved}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              showRemoved ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
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
              ) : isLoading && diff.length === 0 ? (
                <motion.div 
                  key="loading"
                  className="flex flex-col items-center justify-center py-24"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 className="text-white/40 mb-3 animate-spin" size={32} />
                  <p className="text-white/30 text-sm">Loading revision history...</p>
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
                    isTransitioning={isTransitioning}
                    onScrollToChange={handleScrollToChange}
                    showLinks={showLinks}
                    showRemoved={showRemoved}
                    highlightIntensity={highlightIntensity}
                    autoScroll={autoScroll}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>

          {/* Loading indicator */}
          <AnimatePresence>
            {isLoading && diff.length > 0 && (
              <motion.div 
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium text-white/70 flex items-center gap-2 border border-white/10">
                  <Loader2 size={12} className="animate-spin" />
                  Loading...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timeline */}
          <div className="fixed bottom-0 left-0 right-0 lg:right-[340px] z-40">
            <TimelineSlider
              revisions={revisions}
              currentIndex={currentIndex}
              onChange={handleRevisionChange}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Sidebar - Desktop */}
        <div className="hidden lg:block w-[340px] flex-shrink-0 border-l border-white/[0.06] overflow-y-auto">
          <Sidebar revision={revisions[currentIndex]} totalRevisions={revisions.length} />
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
                <Sidebar revision={revisions[currentIndex]} totalRevisions={revisions.length} />
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
