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

  const fetchDailyNews = async () => {
    try {
      console.log('[DailyNews Client] Requesting news...');
      const res = await fetch('/api/education/daily-news');
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
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-background/50 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Knowledge Hub</h2>
        </div>

        <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 max-w-sm w-full">
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

      <main className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 overflow-y-auto custom-scrollbar">

        {/* Daily Briefing Section (News Ticker) */}
        <section className="bg-accent/30 border border-border rounded-xl p-6 relative overflow-hidden group transition-colors hover:bg-accent/40">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Globe className="w-32 h-32" />
          </div>

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="bg-primary/20 p-1.5 rounded">
              <Newspaper className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest leading-none">Daily Briefing</h3>
                <div className="flex items-center border-l border-border pl-2 ml-2 gap-1">
                  <button
                    onClick={() => fetchDailyNews()}
                    disabled={newsLoading}
                    className="p-1 hover:bg-background/50 rounded-md text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh News"
                  >
                    <RefreshCcw className={`w-3 h-3 ${newsLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <Link
                    href="/education/daily-news/history"
                    className="p-1 hover:bg-background/50 rounded-md text-muted-foreground hover:text-primary transition-colors"
                    title="View History"
                  >
                    <Clock className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              {news && <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{news.location} • {format(new Date(news.date), 'MMM dd, yyyy')}</p>}
            </div>

            {news && (
              <div className={`ml-auto flex items-center gap-2 border border-border px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-sm ${getSentimentColor(news.sentimentScore)}`}>
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{news.sentiment} ({news.sentimentScore})</span>
              </div>
            )}
          </div>

          {newsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : news ? (
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {news.summary?.map((item, i) => (
                  <div key={i} className="flex gap-3 group/item">
                    <span className="text-secondary font-bold text-xs mt-1 transition-transform">0{i + 1}</span>
                    <p className="text-sm text-foreground leading-relaxed font-display transition-colors">{item}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-border/50 pt-4">
                <Link
                  href={`/education/daily-news/${format(new Date(news.date), 'yyyy-MM-dd')}`}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25"
                >
                  Read Full Market Wrap <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load daily briefing.</p>
          )}
        </section>

        {/* Page Hero Section */}
        <section className="relative overflow-hidden group py-8">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Alpha Edition</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-foreground mb-6 leading-tight font-display">
              MASTER YOUR <span className="text-primary italic">FINANCIAL</span> FUTURE
            </h1>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-xl">
              Unlock professional-grade financial intelligence. From basic budgeting to complex
              investment vehicles, our AI-curated hub provides the edge you need.
            </p>
          </div>
        </section>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-border pb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${activeCategory === cat
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 rounded-2xl bg-accent/20 animate-pulse border border-border" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/education/${post.slug}`}
                className="group flex flex-col bg-card/0 border border-border hover:border-primary/50 hover:bg-accent/10 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Cover Image Area */}
                <div className="h-48 bg-muted relative overflow-hidden">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = 'https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2664&auto=format&fit=crop';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black relative">
                      <ImageIcon className="w-10 h-10 text-white/10" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-background/50 backdrop-blur-md text-foreground border border-border text-[9px] font-black uppercase tracking-widest px-2 py-1">
                      {post.category}
                    </Badge>
                  </div>
                  {post.isCompleted && (
                    <div className="absolute top-4 right-4 size-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">{post.difficulty}</span>
                    <span className="text-white/20">•</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{post.readTime} MIN READ</span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors font-display">
                    {post.title}
                  </h3>

                  <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mb-6 opacity-80 font-sans">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                    </span>
                    <div className="flex items-center gap-1 text-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      Read Now <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 glass-card rounded-3xl border border-dashed border-border">
            <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">No matching intelligence found</h3>
            <p className="text-xs text-muted-foreground mt-2">Adjust your search parameters to find the edge you need.</p>
          </div>
        )}
      </main>
    </div>
  );
}
