'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Loader2,
  Share,
  MoreHorizontal,
  Mic,
  ArrowUp,
  Bolt,
  History,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import PageSkeleton from '@/components/feedback/page-skeleton';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { InsightSidebar } from '@/components/advisor/insight-sidebar';
import { ChartMessage, ChartConfig } from '@/components/advisor/chart-message';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: Array<{ type: 'document' | 'internet'; id?: string; title?: string; url?: string }>;
  createdAt: string;
  chartConfig?: ChartConfig;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export default function AdvisorPageClient() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // History State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch Conversations
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch('/api/advisor/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    if (user && !authLoading) {
      fetchConversations();
    }
  }, [user, authLoading, fetchConversations]);

  // Fetch Messages when ID changes
  useEffect(() => {
    async function fetchMessages(id: string) {
      try {
        const response = await fetch(`/api/advisor/conversations/${id}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.conversation?.messages || []);
        }
      } catch (e) {
        console.error("Failed to load conversation", e);
      }
    }

    if (currentConversationId) {
      setLoading(true);
      fetchMessages(currentConversationId).finally(() => setLoading(false));
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setHistoryOpen(false);

    // Optional: Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await fetch(`/api/advisor/conversations/${id}`, { method: 'DELETE' });
      await fetchConversations();
      if (currentConversationId === id) {
        startNewConversation();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      if (data.conversation?.id) {
        if (data.conversation.id !== currentConversationId) {
          setCurrentConversationId(data.conversation.id);
          // Refresh list to show new title/message count
          fetchConversations();
        }
      }

      const assistantMessages = data.messages || [];

      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        return [...filtered, ...assistantMessages];
      });

    } catch (error) {
      console.error("Chat error", error);
      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        return [...filtered, {
          id: 'error-' + Date.now(),
          role: 'ASSISTANT',
          content: "I'm having trouble connecting right now. Please try again.",
          createdAt: new Date().toISOString()
        }];
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (authLoading) return <PageSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Please sign in to access your AI Advisor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh)] bg-background text-foreground overflow-hidden font-sans selection:bg-muted">
      {/* LEFT SIDEBAR */}
      <div className="hidden xl:block h-full">
        <InsightSidebar userId={user.id} className="h-full border-r border-border" />
      </div>

      {/* CENTER - CHAT */}
      <section className="flex-1 flex flex-col min-w-0 bg-background relative">
        {/* Header - Optimized for Mobile/Desktop */}
        <header className="flex h-16 border-b border-border/40 items-center justify-between px-4 md:px-6 bg-background/60 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              {/* Mobile specific icon or brand if needed */}
            </div>
            <div>
              <h1 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-foreground font-display">AI Wealth Advisor</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[8px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Neural Engine Active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 hover:bg-muted/50 rounded-xl px-2 md:px-3 h-9">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">History</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-background/80 backdrop-blur-xl border-r border-border/40 p-0">
                <SheetHeader className="p-4 border-b border-border/40">
                  <SheetTitle className="text-sm font-black uppercase tracking-widest">Thought Archives</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <Button
                    onClick={startNewConversation}
                    className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                  >
                    <Plus className="h-4 w-4 mr-2" /> New Interaction
                  </Button>
                  <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
                    {conversations.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-8 font-bold uppercase tracking-widest">No history detected</p>
                    ) : (
                      conversations.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => { setCurrentConversationId(conv.id); setHistoryOpen(false); }}
                          className={`p-4 rounded-xl border cursor-pointer hover:bg-accent/40 transition-all group relative ${currentConversationId === conv.id ? 'bg-accent/60 border-primary/20' : 'border-transparent'
                            }`}
                        >
                          <p className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{conv.title}</p>
                          <p className="text-[9px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">
                            {new Date(conv.updatedAt).toLocaleDateString()} • {conv.messageCount} beats
                          </p>
                          <button
                            onClick={(e) => deleteConversation(e, conv.id)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all text-muted-foreground"
                          >
                            <Trash2 className="h-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-9 w-9">
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-10 custom-scrollbar pt-20 md:pt-8">
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <Loader2 className="h-8 w-8 text-primary animate-spin opacity-50" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4">Syncing with Archives...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in duration-1000 slide-in-from-bottom-4">
              <div className="w-20 h-20 rounded-3xl glass-card flex items-center justify-center shadow-2xl shadow-primary/10 border-primary/20 group hover:scale-110 transition-transform duration-500">
                <Bolt className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div className="max-w-md space-y-3">
                <h2 className="text-3xl md:text-4xl font-black text-foreground font-display tracking-tight">How can I <br /><span className="text-primary italic">OPTIMIZE</span> your future?</h2>
                <p className="text-xs md:text-sm text-muted-foreground font-medium max-w-xs mx-auto opacity-70">Wealth is engineered, not found. Let's analyze your trajectory.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 max-w-xl">
                {["Analyze Q1 Spending", "Project Net Worth", "Tax Harvest Opportunities", "Wealth Trajectory"].map((qs) => (
                  <button
                    key={qs}
                    onClick={() => { setInputMessage(qs); inputRef.current?.focus(); }}
                    className="text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl glass-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    {qs}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex w-full animate-in fade-in duration-500 ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`space-y-4 max-w-[90%] md:max-w-xl ${message.role === 'USER' ? 'text-right' : ''}`}>
                  <div className={`text-sm md:text-[15px] leading-relaxed relative break-words overflow-hidden ${message.role === 'USER'
                    ? 'bg-primary text-primary-foreground px-6 py-4 rounded-3xl rounded-tr-none inline-block text-left shadow-xl shadow-primary/10 tracking-tight font-medium'
                    : 'glass-card border-l-4 border-l-primary/40 p-5 md:p-6 rounded-3xl shadow-xl shadow-primary/5 text-foreground/90 font-medium'
                    }`}>
                    {message.role === 'ASSISTANT' ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <span className="opacity-95">{message.content}</span>
                    )}
                  </div>

                  {message.chartConfig && (
                    <div className="mt-6 w-full h-[300px] glass-card rounded-3xl p-6 border-none shadow-2xl">
                      <ChartMessage config={message.chartConfig} />
                    </div>
                  )}

                  <div className={`flex items-center gap-2 mt-2 px-1 ${message.role === 'USER' ? 'justify-end' : ''}`}>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} className="h-10" />
        </div>

        {/* Input area */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-sm">
          <div className="relative max-w-4xl mx-auto group">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-2xl group-focus-within:bg-primary/10 transition-all duration-500 -z-10" />

            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask for financial intelligence..."
              disabled={loading}
              className="w-full bg-card/40 border-border/40 hover:border-primary/20 rounded-3xl py-7 pl-7 pr-24 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm md:text-base text-foreground placeholder:text-muted-foreground/50 shadow-2xl backdrop-blur-xl transition-all h-auto"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                size="icon"
                className="bg-primary text-primary-foreground h-11 w-11 rounded-2xl hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-6 w-6 font-bold" />}
              </Button>
            </div>
          </div>
          <p className="text-center text-[8px] md:text-[9px] text-muted-foreground/60 mt-4 uppercase tracking-[0.3em] font-black pointer-events-none select-none">
            Encrypted End-to-End • Quantum-Grade Models Active • v5.0.1
          </p>
        </div>
      </section>
    </div>
  );
}
