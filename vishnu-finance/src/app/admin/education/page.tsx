'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Sparkles,
    Eye,
    Check,
    X,
    Loader2,
    Wand2,
    LayoutGrid,
    FileText
} from 'lucide-react';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Post {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    category: string;
    difficulty: string;
    readTime: number;
    published: boolean;
    createdAt: string;
    coverImage?: string;
    imagePrompt?: string;
}

export default function AdminEducationPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
    const [genTopic, setGenTopic] = useState('');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/education');
            const data = await res.json();
            setPosts(data);
        } catch (error) {
            toast.error('Failed to fetch posts');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPost) return;

        try {
            const method = editingPost.id ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/education', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingPost)
            });

            if (!res.ok) throw new Error();

            toast.success(editingPost.id ? 'Post updated' : 'Post created');
            setIsDialogOpen(false);
            fetchPosts();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            const res = await fetch(`/api/admin/education?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            toast.success('Post deleted');
            fetchPosts();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const generateWithAI = async () => {
        if (!genTopic) {
            toast.error('Please enter a topic');
            return;
        }
        setIsGenerating(true);
        try {
            const res = await fetch('/api/admin/education/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: genTopic })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setEditingPost({
                ...data,
                published: false
            });
            toast.success('Generated! You can now review and save.');
        } catch (error: any) {
            toast.error(error.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                        <LayoutGrid className="w-8 h-8 text-primary" />
                        Manage Knowledge Hub
                    </h1>
                    <p className="text-muted-foreground">Create, edit, and generate educational content for your users.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingPost({})} className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Post
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingPost?.id ? 'Edit Post' : 'Create Post'}</DialogTitle>
                        </DialogHeader>

                        {!editingPost?.id && (
                            <div className="bg-muted/30 p-4 rounded-xl border border-primary/10 mb-6 group transition-all">
                                <Label className="flex items-center gap-2 mb-2 text-primary font-bold">
                                    <Wand2 className="w-4 h-4" />
                                    AI Post Generator
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter a topic (e.g. 'Advanced Tax Saving Strategies for 2026')"
                                        value={genTopic}
                                        onChange={(e) => setGenTopic(e.target.value)}
                                        className="bg-background border-primary/20"
                                    />
                                    <Button
                                        onClick={generateWithAI}
                                        disabled={isGenerating}
                                        variant="secondary"
                                        className="shrink-0"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        Generate
                                    </Button>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleCreateOrUpdate} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Intelligence Title</Label>
                                    <Input
                                        className="h-10 bg-muted/20 border-border focus:border-primary/50"
                                        value={editingPost?.title || ''}
                                        onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Access Slug</Label>
                                    <Input
                                        className="h-10 bg-muted/20 border-border focus:border-primary/50"
                                        value={editingPost?.slug || ''}
                                        onChange={e => setEditingPost({ ...editingPost, slug: e.target.value })}
                                        placeholder="url-friendly-slug-auto-generated"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Premium Cover Asset</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            className="h-10 bg-muted/20 border-border focus:border-primary/50"
                                            value={editingPost?.coverImage || ''}
                                            onChange={e => setEditingPost({ ...editingPost, coverImage: e.target.value })}
                                            placeholder="https://..."
                                        />
                                        {editingPost?.coverImage && (
                                            <div className="size-10 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                                                <img
                                                    src={editingPost.coverImage}
                                                    className="w-full h-full object-cover"
                                                    alt="Preview"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/placeholder-image.jpg'; // Fallback
                                                        target.onerror = null; // Prevent infinite loop
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Visual Blueprint</Label>
                                    <Input
                                        className="h-10 bg-muted/20 border-border focus:border-primary/50"
                                        value={editingPost?.imagePrompt || ''}
                                        onChange={e => setEditingPost({ ...editingPost, imagePrompt: e.target.value })}
                                        placeholder="Describe the visual aesthetic..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Insight Summary</Label>
                                <Textarea
                                    className="bg-muted/20 border-border focus:border-primary/50 min-h-[60px]"
                                    value={editingPost?.excerpt || ''}
                                    onChange={e => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detailed Intelligence (Markdown)</Label>
                                <MarkdownEditor
                                    value={editingPost?.content || ''}
                                    onChange={value => setEditingPost({ ...editingPost, content: value })}
                                    rows={15}
                                />
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                                    <Input
                                        className="h-10 bg-muted/20 border-border focus:border-primary/50"
                                        value={editingPost?.category || ''}
                                        onChange={e => setEditingPost({ ...editingPost, category: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Difficulty</Label>
                                    <Input
                                        className="h-10 bg-muted/20 border-border focus:border-primary/50"
                                        value={editingPost?.difficulty || ''}
                                        onChange={e => setEditingPost({ ...editingPost, difficulty: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Read Time</Label>
                                    <Input
                                        className="h-10 bg-muted/20 border-border focus:border-primary/50"
                                        type="number"
                                        value={editingPost?.readTime || 5}
                                        onChange={e => setEditingPost({ ...editingPost, readTime: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-8">
                                    <input
                                        type="checkbox"
                                        id="published"
                                        checked={editingPost?.published || false}
                                        onChange={e => setEditingPost({ ...editingPost, published: e.target.checked })}
                                        className="size-5 rounded border-border text-primary focus:ring-primary bg-muted/20"
                                    />
                                    <Label htmlFor="published" className="text-[10px] font-black uppercase tracking-widest">Published</Label>
                                </div>
                            </div>

                            <DialogFooter className="pt-6 border-t border-border mt-8">
                                <Button type="submit" className="w-full md:w-auto px-12 h-12 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                                    {editingPost?.id ? 'Update Intelligence' : 'Deploy Intelligence'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-6 py-4 font-semibold text-sm">Post</th>
                                <th className="px-6 py-4 font-semibold text-sm text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-sm text-center">Difficulty</th>
                                <th className="px-6 py-4 font-semibold text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {posts.map((post) => (
                                <tr key={post.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{post.title}</span>
                                            <span className="text-xs text-muted-foreground">/{post.slug}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant={post.published ? 'default' : 'secondary'} className="rounded-full px-4">
                                            {post.published ? 'Published' : 'Draft'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-medium capitalize">{post.difficulty}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setEditingPost(post);
                                                setIsDialogOpen(true);
                                            }}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-destructive hover:bg-destructive/10">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {posts.length === 0 && !loading && (
                        <div className="py-20 text-center">
                            <FileText className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">No posts created yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
