'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Clock,
  ChevronRight,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Image as ImageIcon,
  Newspaper,
  Globe,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  difficulty: string;
  readTime: number;
  isCompleted: boolean;
  coverImage?: string;
  createdAt: string;
}

interface DailyNews {
  sentiment: string;
  sentimentScore: number;
  summary: string[];
  location: string;
  date: string;
}

const CATEGORIES = ['All', 'Budgeting', 'Saving', 'Investing', 'Debt', 'Insurance', 'Tax', 'General'];

export default function EducationPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // News State
  const [news, setNews] = useState<DailyNews | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  useEffect(() => {
    fetchDailyNews();
  }, []);

  const fetchDailyNews = async (force: boolean = false) => {
    try {
      setNewsLoading(true);
      console.log(`[DailyNews Client] Requesting news (force=${force})...`);
      const url = new URL('/api/education/daily-news', window.location.origin);
      if (force) url.searchParams.append('force', 'true');

      const res = await fetch(url.toString());
      console.log('[DailyNews Client] Response received:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[DailyNews Client] Data parsed:', data);
        setNews(data);
      } else {
        console.error('[DailyNews Client] Error response:', await res.text());
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/education/posts', window.location.origin);
      if (activeCategory !== 'All') url.searchParams.append('category', activeCategory);
      if (search) url.searchParams.append('search', search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  // Determine sentiment color
  const getSentimentColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-full bg-background text-muted-foreground transition-colors duration-300 font-sans selection:bg-primary/30 selection:text-white">
      {/* Header - Desktop Only */}
      <header className="hidden lg:flex h-16 border-b border-border items-center justify-between px-8 shrink-0 bg-background/50 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Knowledge Hub</h2>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative w-full group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <Input
              placeholder="Search concepts, guides..."
              className="h-8 pl-8 text-[10px] bg-accent/50 border-border uppercase tracking-widest font-bold focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-primary/20 text-primary bg-primary/5">
            {posts.filter(p => p.isCompleted).length} Completed
          </Badge>
        </div>
      </header>

      <main className="p-4 pt-20 md:p-8 md:pt-8 space-y-8 max-w-7xl mx-auto w-full pb-24 overflow-y-auto custom-scrollbar">

        {/* Daily Briefing Section (News Ticker) */}
        <section className="glass-card p-5 md:p-6 rounded-3xl relative overflow-hidden group hover:bg-accent/5 transition-colors border-none shadow-xl shadow-primary/5">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform group-hover:scale-110 duration-700 hidden md:block">
            <Globe className="w-48 h-48 rotate-12" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-3 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 backdrop-blur-md">
                <Newspaper className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none font-display">Daily Briefing</h3>
                {news && <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">{news.location} • {format(new Date(news.date), 'MMM dd')}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {news && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background/30 backdrop-blur-md ${getSentimentColor(news.sentimentScore)} border-current/20 shadow-sm`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{news.sentiment}</span>
                </div>
              )}
              <div className="flex items-center border-l border-border pl-2 ml-2 gap-1 text-muted-foreground">
                <button
                  onClick={() => fetchDailyNews(true)}
                  disabled={newsLoading}
                  className="p-2 hover:bg-foreground/10 rounded-md hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Force Regenerate News & Image"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${newsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {newsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin opacity-50" />
            </div>
          ) : news ? (
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
                {news.summary?.map((item, i) => (
                  <div key={i} className="flex gap-4 group/item">
                    <span className="text-5xl md:text-7xl font-black text-primary/5 leading-[0.8] -mt-2 group-hover/item:text-primary/10 transition-colors select-none font-display">
                      0{i + 1}
                    </span>
                    <p className="text-xs md:text-sm text-foreground/90 leading-relaxed font-medium pt-1 md:pt-2 -ml-4 md:-ml-6 relative z-10">{item}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-dashed border-border/50">
                <Link
                  href={`/education/daily-news/${format(new Date(news.date), 'yyyy-MM-dd')}`}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-lg hover:shadow-primary/25 w-full md:w-auto justify-center"
                >
                  Read Full Market Wrap <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Unable to load daily briefing.</p>
          )}
        </section>

        {/* Page Hero Section - Hidden on Mobile to save space per "clutter" request? Or simplified? Let's simplify. */}
        <section className="relative py-2 px-2 md:py-4">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-4 md:mb-6 leading-[0.9] font-display">
              MASTER YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50 italic pr-2">FINANCIAL</span>
              FUTURE
            </h1>
          </div>
        </section>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border backdrop-blur-sm ${activeCategory === cat
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105'
                : 'bg-card/40 border-border text-muted-foreground hover:border-primary/30 hover:bg-background/50 hover:text-foreground'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-3xl bg-muted/10 animate-pulse border border-border/50" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/education/${post.slug}`}
                className="glass-card group flex flex-col rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 border-none bg-card/40 relative"
              >
                {/* Border Accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50 group-hover:bg-primary transition-colors z-30" />

                {/* Cover Image Area - Reduced height on mobile */}
                <div className="h-48 md:h-56 bg-muted relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent z-10" />

                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2664&auto=format&fit=crop';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black relative">
                      <ImageIcon className="w-10 h-10 text-white/10" />
                    </div>
                  )}

                  <div className="absolute top-4 left-4 z-20 pl-2">
                    <Badge className="bg-background/80 backdrop-blur-xl text-foreground border-white/10 text-[9px] font-black uppercase tracking-widest px-3 py-1 shadow-sm">
                      {post.category}
                    </Badge>
                  </div>
                </div>

                <div className="p-5 md:p-8 flex flex-col flex-1 relative -mt-12 z-20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-1 rounded-md backdrop-blur-sm">{post.difficulty}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime} MIN
                    </span>
                  </div>

                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 leading-tight group-hover:text-primary transition-colors font-display line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mb-4 opacity-80 font-medium">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                      {format(new Date(post.createdAt), 'MMM dd')}
                    </span>
                    <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                      Read <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-card rounded-3xl border-dashed opacity-50">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">No matching intelligence</h3>
          </div>
        )}
      </main>
    </div>
  );
}
