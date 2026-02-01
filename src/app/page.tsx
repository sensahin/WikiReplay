
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRevisionHistory, fetchRevisionContent, fetchRandomArticle, Revision } from '@/lib/wikiApi';
import { calculateDiff, ExtendedChange } from '@/lib/diffUtils';
import { TimelineSlider } from '@/components/TimelineSlider';
import { DiffViewer } from '@/components/DiffViewer';
import { Sidebar } from '@/components/Sidebar';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { Loader2, History, Github, Menu, X } from 'lucide-react';

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
  const scrollToChangeRef = useRef<(() => void) | null>(null);

  // Load a random article on initial mount
  useEffect(() => {
    const loadRandomArticle = async () => {
      try {
        const randomTitle = await fetchRandomArticle();
        setTitle(randomTitle);
        setSearchInput(randomTitle);
      } catch (err) {
        // Fallback to a default article if random fetch fails
        setTitle('Wikipedia');
        setSearchInput('Wikipedia');
      }
    };
    loadRandomArticle();
  }, []);

  const loadArticle = async (articleTitle: string) => {
    setIsLoading(true);
    setError(null);
    setDiff([]);
    setRevisions([]);
    setCurrentIndex(0);
    try {
      const history = await fetchRevisionHistory(articleTitle, 50000, true);
      const reversedHistory = [...history].reverse();
      setRevisions(reversedHistory);
      setCurrentIndex(0);

      if (reversedHistory.length > 0) {
        const firstRev = reversedHistory[0];
        const firstContent = await fetchRevisionContent(firstRev.revid);
        const newDiff = calculateDiff('', firstContent);
        setDiff(newDiff);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (title) {
      loadArticle(title);
    }
  }, [title]);

  const handleRevisionChange = async (index: number) => {
    if (index === currentIndex || isLoading) return;

    setIsTransitioning(true);
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const currentRev = revisions[index];
      const prevRev = revisions[index - 1];

      const currentContent = await fetchRevisionContent(currentRev.revid);
      const prevContent = prevRev ? await fetchRevisionContent(prevRev.revid) : '';

      const newDiff = calculateDiff(prevContent, currentContent);
      setDiff(newDiff);
      setCurrentIndex(index);
      
      setTimeout(() => {
        setIsTransitioning(false);
        setTimeout(() => {
          if (scrollToChangeRef.current) {
            scrollToChangeRef.current();
          }
        }, 200);
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsTransitioning(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrollToChange = useCallback((scrollFn: () => void) => {
    scrollToChangeRef.current = scrollFn;
  }, []);

  const handleSelectArticle = (articleTitle: string) => {
    if (articleTitle.trim() && articleTitle.trim() !== title) {
      setTitle(articleTitle.trim());
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-14 md:h-16 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-50 flex items-center px-4 md:px-6 lg:px-10">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 md:gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <History className="text-white" size={14} />
          </div>
          <span className="text-sm md:text-[15px] font-semibold tracking-tight hidden sm:block">
            WikiReplay
          </span>
        </a>

        {/* Search - centered on desktop, flex-1 on mobile */}
        <div className="flex-1 flex justify-center mx-3 md:mx-6 lg:mr-[340px]">
          <div className="w-full max-w-md">
            <SearchAutocomplete
              value={searchInput}
              onChange={setSearchInput}
              onSelect={handleSelectArticle}
              placeholder="Search Wikipedia..."
            />
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/yourusername/wikireplay"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            title="View on GitHub"
          >
            <Github size={18} />
          </a>
          
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
