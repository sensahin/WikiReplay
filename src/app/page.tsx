
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRevisionHistory, fetchRevisionContent, Revision } from '@/lib/wikiApi';
import { calculateDiff, ExtendedChange } from '@/lib/diffUtils';
import { TimelineSlider } from '@/components/TimelineSlider';
import { DiffViewer } from '@/components/DiffViewer';
import { Sidebar } from '@/components/Sidebar';
import { Search, Loader2, History, Sparkles } from 'lucide-react';

export default function Home() {
  const [title, setTitle] = useState('React (software)');
  const [searchInput, setSearchInput] = useState('React (software)');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [diff, setDiff] = useState<ExtendedChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollToChangeRef = useRef<(() => void) | null>(null);

  const loadArticle = async (articleTitle: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const history = await fetchRevisionHistory(articleTitle);
      // Reverse to have chronological order for the slider (older to newer)
      const reversedHistory = [...history].reverse();
      setRevisions(reversedHistory);
      setCurrentIndex(reversedHistory.length - 1);

      // Load content for the latest and its parent to show initial diff
      if (reversedHistory.length > 0) {
        const latestRev = reversedHistory[reversedHistory.length - 1];
        const prevRev = reversedHistory[reversedHistory.length - 2];

        const latestContent = await fetchRevisionContent(latestRev.revid);
        const prevContent = prevRev ? await fetchRevisionContent(prevRev.revid) : '';

        const newDiff = calculateDiff(prevContent, latestContent);
        setDiff(newDiff);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticle(title);
  }, [title]);

  const handleRevisionChange = async (index: number) => {
    if (index === currentIndex || isLoading) return;

    setIsTransitioning(true);
    setIsLoading(true);
    
    // Small delay to let the fade-out animation play
    await new Promise(resolve => setTimeout(resolve, 200));
    
    try {
      const currentRev = revisions[index];
      const prevRev = revisions[index - 1];

      const currentContent = await fetchRevisionContent(currentRev.revid);
      const prevContent = prevRev ? await fetchRevisionContent(prevRev.revid) : '';

      const newDiff = calculateDiff(prevContent, currentContent);
      setDiff(newDiff);
      setCurrentIndex(index);
      
      // Allow the new content to render before scrolling
      setTimeout(() => {
        setIsTransitioning(false);
        // Scroll to first change after transition
        setTimeout(() => {
          if (scrollToChangeRef.current) {
            scrollToChangeRef.current();
          }
        }, 300);
      }, 100);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTitle(searchInput.trim());
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <History className="text-white" size={22} />
          </motion.div>
          <h1 className="text-xl font-bold tracking-tight">
            Wiki<span className="text-blue-400">Diff</span>
          </h1>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Wikipedia article..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all text-sm"
            />
          </div>
        </form>

        <div className="w-40 flex justify-end">
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-medium text-white/40 uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={12} className="text-purple-400" />
            v1.0 Beta
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Article Title Overlay */}
          <div className="px-12 pt-8 pb-4 z-10 bg-gradient-to-b from-[#050505] via-[#050505]/95 to-transparent">
            <div className="flex items-center gap-4 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                Wikipedia
              </span>
              <span className="text-white/20 text-xs">—</span>
              <span className="text-white/40 text-xs">{revisions.length} Revisions tracked</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50">
              {title}
            </h2>
          </div>

          {/* Diff Viewer Container - scrollable area */}
          <div className="flex-1 overflow-y-auto px-12 pb-48 custom-scrollbar scroll-smooth">
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div 
                  key="error"
                  className="h-full flex flex-col items-center justify-center text-center py-20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                    <span className="text-rose-500 text-2xl font-bold">!</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Oops! Article not found</h3>
                  <p className="text-white/40 max-w-sm">
                    We couldn&apos;t find the Wikipedia article you&apos;re looking for. Please check the spelling and try again.
                  </p>
                </motion.div>
              ) : isLoading && diff.length === 0 ? (
                <motion.div 
                  key="loading"
                  className="h-full flex flex-col items-center justify-center py-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="text-blue-400 mb-4" size={48} />
                  </motion.div>
                  <p className="text-white/40 animate-pulse uppercase tracking-[0.2em] text-[10px]">Fetching History...</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="content"
                  className="relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Loading overlay indicator */}
                  <AnimatePresence>
                    {isLoading && (
                      <motion.div 
                        className="absolute inset-x-0 -top-2 z-20 flex justify-center"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/40 flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Loader2 size={12} />
                          </motion.div>
                          Syncing revision...
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <DiffViewer 
                    diff={diff} 
                    isTransitioning={isTransitioning}
                    onScrollToChange={handleScrollToChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fixed Timeline Control at Bottom */}
          <div className="fixed bottom-0 left-0 z-40" style={{ right: '320px' }}>
            <TimelineSlider
              revisions={revisions}
              currentIndex={currentIndex}
              onChange={handleRevisionChange}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Sidebar - fixed width */}
        <div className="w-80 flex-shrink-0">
          <Sidebar revision={revisions[currentIndex]} />
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom range slider styling */
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </main>
  );
}
