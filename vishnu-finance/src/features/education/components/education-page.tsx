'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Clock,
  ChevronRight,
  GraduationCap,
  TrendingUp,
  Image as ImageIcon,
  Newspaper,
  Globe,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PageHero } from '@/components/ui/hero';
import { SectionLabel } from '@/components/ui/section-label';
import { NavPill, NavPillGroup } from '@/components/ui/nav-pill';
import { Card } from '@/components/ui/card';
import { patterns } from '@/design/patterns';
import { getSentimentChipVariant } from '@/design/tokens';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useMobileRefreshRegister } from '@/contexts/MobileRefreshContext';

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
  const [news, setNews] = useState<DailyNews | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  const fetchDailyNews = useCallback(async (force: boolean = false) => {
    try {
      setNewsLoading(true);
      const url = new URL('/api/education/daily-news', window.location.origin);
      if (force) url.searchParams.append('force', 'true');

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
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
  }, [activeCategory, search]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    void fetchDailyNews();
  }, [fetchDailyNews]);

  useMobileRefreshRegister(
    useCallback(async () => {
      await Promise.all([fetchDailyNews(), fetchPosts()]);
    }, [fetchDailyNews, fetchPosts])
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  const completedCount = posts.filter((p) => p.isCompleted).length;

  return (
    <div className="flex h-full flex-col text-muted">
      <main className="space-y-6 overflow-y-auto custom-scrollbar scroll-pb-bottom-bar">
        <Card className="card-base relative overflow-hidden p-5 md:p-6">
          <div className="pointer-events-none absolute right-0 top-0 hidden p-8 opacity-[0.06] md:block">
            <Globe className="size-48 rotate-12" />
          </div>

          <div className="relative z-10 mb-5 flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md border border-border bg-surface p-2">
                <Newspaper className="size-5 text-foreground" />
              </div>
              <div>
                <SectionLabel className="mb-0">Daily Briefing</SectionLabel>
                {news && (
                  <p className="mt-0.5 text-xs text-hint">
                    {news.location} · {format(new Date(news.date), 'MMM dd')}
                  </p>
                )}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {news && (
                <Chip variant={getSentimentChipVariant(news.sentimentScore)}>
                  <TrendingUp className="mr-1 size-3" />
                  {news.sentiment}
                </Chip>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchDailyNews(true)}
                disabled={newsLoading}
                className="size-8"
                title="Force Regenerate News & Image"
              >
                <RefreshCcw className={cn('size-3.5', newsLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {newsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-hint" />
            </div>
          ) : news ? (
            <div className="relative z-10">
              <div className="mb-5 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                {news.summary?.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="select-none font-mono text-3xl font-medium leading-none text-hint md:text-4xl">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm leading-relaxed text-foreground">{item}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-dashed border-border pt-4">
                <Button asChild size="sm">
                  <Link href={`/education/daily-news/${format(new Date(news.date), 'yyyy-MM-dd')}`}>
                    Read Full Market Wrap
                    <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-hint">Unable to load daily briefing.</p>
          )}
        </Card>

        <PageHero
          tag="Financial Education"
          title="Master your financial future"
          subtitle="Guides and insights to help you build lasting wealth."
          className="hidden lg:block"
        />

        <div className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 -mx-1 py-2 lg:static lg:py-0">
          <NavPillGroup className="overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <NavPill
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </NavPillGroup>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-base h-64 animate-pulse bg-surface" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/education/${post.slug}`} className="group block">
                <Card className="card-base flex h-full flex-col overflow-hidden transition-colors hover:bg-surface">
                  <div className="relative h-44 overflow-hidden bg-surface md:h-52">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src =
                            'https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2664&auto=format&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-surface">
                        <ImageIcon className="size-10 text-hint" />
                      </div>
                    )}

                    <div className="absolute left-3 top-3">
                      <Chip variant="neutral">{post.category}</Chip>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4 md:p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Chip variant="info">{post.difficulty}</Chip>
                      <span className="flex items-center gap-1 text-[11px] text-hint">
                        <Clock className="size-3" />
                        {post.readTime} min
                      </span>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-base font-medium text-foreground group-hover:text-foreground">
                      {post.title}
                    </h3>

                    <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted">
                      {post.excerpt}
                    </p>

                    <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                      <span className="text-[11px] text-hint">
                        {format(new Date(post.createdAt), 'MMM dd')}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-foreground group-hover:gap-2 transition-all">
                        Read
                        <ChevronRight className="size-3" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="card-base border-dashed py-12 text-center">
            <BookOpen className="mx-auto mb-4 size-12 text-hint" />
            <SectionLabel className="mb-0 text-foreground">No matching guides</SectionLabel>
          </Card>
        )}
      </main>
    </div>
  );
}
