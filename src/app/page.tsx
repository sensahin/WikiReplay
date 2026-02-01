
'use client';

import React, { useState, useEffect } from 'react';
import { fetchRevisionHistory, fetchRevisionContent, Revision } from '@/lib/wikiApi';
import { calculateDiff, ExtendedChange } from '@/lib/diffUtils';
import { TimelineSlider } from '@/components/TimelineSlider';
import { DiffViewer } from '@/components/DiffViewer';
import { Sidebar } from '@/components/Sidebar';
import { Search, Loader2, History } from 'lucide-react';

export default function Home() {
  const [title, setTitle] = useState('React (software)');
  const [searchInput, setSearchInput] = useState('React (software)');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [diff, setDiff] = useState<ExtendedChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (index === currentIndex) return;

    setIsLoading(true);
    try {
      const currentRev = revisions[index];
      const prevRev = revisions[index - 1];

      const currentContent = await fetchRevisionContent(currentRev.revid);
      const prevContent = prevRev ? await fetchRevisionContent(prevRev.revid) : '';

      const newDiff = calculateDiff(prevContent, currentContent);
      setDiff(newDiff);
      setCurrentIndex(index);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTitle(searchInput.trim());
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <History className="text-white" size={22} />
          </div>
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
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-medium text-white/40 uppercase tracking-widest">
            v1.0 Beta
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Article Title Overlay */}
          <div className="px-12 pt-12 pb-6 z-10 bg-gradient-to-b from-[#050505] to-transparent">
            <div className="flex items-center gap-4 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                Wikipedia
              </span>
              <span className="text-white/20 text-xs">—</span>
              <span className="text-white/40 text-xs">{revisions.length} Revisions tracked</span>
            </div>
            <h2 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50">
              {title}
            </h2>
          </div>

          {/* Diff Viewer Container */}
          <div className="flex-1 overflow-y-auto px-12 pb-32 custom-scrollbar">
            {error ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                  <span className="text-rose-500 text-2xl font-bold">!</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Oops! Article not found</h3>
                <p className="text-white/40 max-w-sm">
                  We couldn&apos;t find the Wikipedia article you&apos;re looking for. Please check the spelling and try again.
                </p>
              </div>
            ) : isLoading && diff.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-blue-400 mb-4" size={48} />
                <p className="text-white/40 animate-pulse uppercase tracking-[0.2em] text-[10px]">Fetching History...</p>
              </div>
            ) : (
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-x-0 -top-4 z-20 flex justify-center">
                    <div className="bg-blue-500 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/40 animate-bounce">
                      Syncing...
                    </div>
                  </div>
                )}
                <DiffViewer diff={diff} />
              </div>
            )}
          </div>

          {/* Floating Timeline Control */}
          <div className="absolute bottom-8 inset-x-12 z-40">
            <TimelineSlider
              revisions={revisions}
              currentIndex={currentIndex}
              onChange={handleRevisionChange}
            />
          </div>
        </div>

        {/* Sidebar */}
        <Sidebar revision={revisions[currentIndex]} />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
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
      `}</style>
    </main>
  );
}
