'use client';

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Clock,
    User,
    Share2,
    Bookmark,
    Sparkles,
    Image as ImageIcon,
    LayoutDashboard,
    BookOpen,
    LineChart,
    Wallet,
    Settings,
    Search,
    Menu,
    List
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

interface Post {
    id: string;
    title: string;
    content: string;
    excerpt: string;
    category: string;
    difficulty: string;
    readTime: number;
    createdAt: string;
    isCompleted: boolean;
    coverImage?: string;
    author: {
        name: string;
        avatarUrl?: string;
        bio?: string;
    };
}

export default function PostDetail() {
    const { slug } = useParams();
    const router = useRouter();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        fetchPost();
    }, [slug]);

    const fetchPost = async () => {
        try {
            const res = await fetch(`/api/education/posts/${slug}`);
            if (!res.ok) throw new Error('Not found');
            const data = await res.json();
            setPost(data);
        } catch (error) {
            console.error(error);
            router.push('/education');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComplete = async () => {
        if (!post || completing) return;
        setCompleting(true);
        try {
            const isCompleted = !post.isCompleted;
            const res = await fetch('/api/education/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: post.id, isCompleted })
            });
            if (res.ok) {
                setPost({ ...post, isCompleted });
            }
        } finally {
            setCompleting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-matte-black text-silver">
            <div className="animate-pulse flex flex-col items-center">
                <Sparkles className="w-8 h-8 text-primary mb-4 animate-spin-slow" />
                <p className="text-xs font-sans uppercase tracking-widest">Loading Intelligence...</p>
            </div>
        </div>
    );

    if (!post) return null;

    return (
        <div className="flex flex-col h-full bg-background text-muted-foreground font-display selection:bg-primary/30 selection:text-white overflow-y-auto custom-scrollbar">

            {/* Main Content Area */}
            <main className="flex-1 relative">
                {/* Top App Bar (Floating) */}
                <div className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
                    <div className="flex items-center gap-4">
                        <Link href="/education" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-[0.2em]">Reading Mode</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-accent/50 rounded-full border border-border">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-foreground">Live</span>
                        </div>
                        <button className="text-muted-foreground hover:text-foreground transition-colors"><Search className="w-4 h-4" /></button>
                        <button className="text-muted-foreground hover:text-foreground transition-colors"><Bookmark className="w-4 h-4" /></button>
                        <button
                            onClick={() => {
                                navigator.share?.({ title: post.title, url: window.location.href })
                                    .catch(() => navigator.clipboard.writeText(window.location.href));
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleToggleComplete}
                            className={`px-4 py-1.5 rounded text-[10px] font-sans font-bold uppercase tracking-widest transition-all ${post.isCompleted ? 'bg-accent text-muted-foreground cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                        >
                            {post.isCompleted ? 'Marked Complete' : 'Mark Complete'}
                        </button>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-6 pb-24">
                    {/* Header Image */}
                    {/* Header Image Banner */}
                    <div className="relative mt-6 mb-8 rounded-xl overflow-hidden w-full aspect-[3/1] shadow-lg bg-muted group">
                        {post.coverImage ? (
                            <img
                                src={post.coverImage}
                                alt={post.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-muted flex items-center justify-center">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <ImageIcon className="w-8 h-8" />
                                    <span className="text-[10px] font-sans uppercase tracking-widest">No Banner Image</span>
                                </div>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent"></div>
                    </div>

                    {/* Title Section */}
                    <div className="mb-12 text-center max-w-2xl mx-auto">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm">
                                {post.category}
                            </Badge>
                            <span className="text-muted-foreground text-[10px] uppercase tracking-widest">•</span>
                            <span className="text-muted-foreground text-[10px] uppercase tracking-widest">{post.readTime} MIN READ</span>
                        </div>

                        <h1 className="text-foreground text-4xl md:text-5xl font-bold leading-tight mb-6 font-display">
                            {post.title}
                        </h1>

                        <div className="flex items-center justify-center gap-6 text-muted-foreground font-sans text-[11px] uppercase tracking-wider">
                            <span className="flex items-center gap-1.5 opacity-70"><User className="w-3.5 h-3.5" /> {post.author.name}</span>
                            <span className="flex items-center gap-1.5 opacity-70"><Clock className="w-3.5 h-3.5" /> {format(new Date(post.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                    </div>

                    {/* Article Content */}
                    <div className="space-y-8">
                        {/* Intro / Excerpt */}
                        <p className="text-xl md:text-2xl leading-relaxed text-muted-foreground italic font-display border-l-2 border-primary pl-6 py-2">
                            "{post.excerpt}"
                        </p>

                        <div className="education-content font-display text-lg leading-loose text-muted-foreground/90 space-y-6">
                            <ReactMarkdown
                                components={{
                                    h1: ({ ...props }) => <h2 className="text-foreground text-2xl font-bold mt-12 mb-6 font-sans border-b border-border pb-4" {...props} />,
                                    h2: ({ ...props }) => <h2 className="text-foreground text-2xl font-bold mt-12 mb-4 font-sans pl-4 border-l-2 border-primary" {...props} />,
                                    h3: ({ ...props }) => <h3 className="text-foreground text-xl font-semibold mt-8 mb-3" {...props} />,
                                    p: ({ ...props }) => <p className="mb-6 leading-8" {...props} />,
                                    ul: ({ ...props }) => <ul className="space-y-3 pl-2 my-6" {...props} />,
                                    li: ({ ...props }) => (
                                        <li className="flex items-start gap-3">
                                            <span className="text-primary font-bold mt-1.5">•</span>
                                            <span className="flex-1" {...props} />
                                        </li>
                                    ),
                                    blockquote: ({ children }) => (
                                        <div className="bg-accent/50 border border-border p-6 rounded-xl my-10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                                <Sparkles className="w-24 h-24" />
                                            </div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider font-sans">Pro Tip</span>
                                                <span className="text-foreground text-xs font-bold font-sans uppercase tracking-widest">Vishnu Insight</span>
                                            </div>
                                            <div className="text-muted-foreground italic relative z-10">{children}</div>
                                        </div>
                                    ),
                                    strong: ({ ...props }) => <strong className="text-foreground font-semibold" {...props} />,
                                    a: ({ ...props }) => <a className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary transition-all" {...props} />
                                }}
                            >
                                {post.content}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-20 pt-10 border-t border-border text-center">
                        <button
                            onClick={handleToggleComplete}
                            disabled={post.isCompleted}
                            className={`px-8 py-3 font-sans text-xs font-bold uppercase tracking-widest rounded transition-all ${post.isCompleted ? 'bg-accent text-muted-foreground cursor-default' : 'bg-foreground text-background hover:bg-muted-foreground'}`}
                        >
                            {post.isCompleted ? 'Reading Completed' : 'Mark as Complete'}
                        </button>
                        <p className="mt-6 text-muted-foreground font-sans text-[10px] uppercase tracking-tighter">© 2024 Vishnu Finance Premium • ID: vf-{post.id.slice(0, 8)}</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
