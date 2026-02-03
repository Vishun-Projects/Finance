'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  difficulty: string;
}

export default function FinancialEducationAssistant() {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatestTip = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/education/posts?limit=1');
      const data = await res.json();
      if (data && data.length > 0) {
        setPost(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch tip:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestTip();
  }, []);

  if (loading) return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-4" />
      <div className="h-6 w-full bg-muted rounded mb-2" />
      <div className="h-4 w-3/4 bg-muted rounded" />
    </div>
  );

  if (!post) return null;

  return (
    <section className="rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm group hover:border-primary/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Smart Insight</span>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
          {post.category}
        </span>
      </div>

      <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
        {post.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-6">
        {post.excerpt}
      </p>

      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Level: <span className="font-bold text-foreground">{post.difficulty}</span>
        </div>
        <Link href={`/education/${post.slug}`}>
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-2 hover:bg-primary/10 hover:text-primary rounded-full px-4">
            Learn More
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
