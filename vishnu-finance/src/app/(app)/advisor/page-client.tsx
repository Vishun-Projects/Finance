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
        {/* Header - Industrial Audit Style */}
        <header className="flex h-12 border-b border-border items-center justify-between px-4 md:px-6 bg-card sticky top-0 z-20 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Intelligence Hub</h1>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden sm:inline">Active Audit Session</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 hover:bg-muted/50 rounded-lg px-2 md:px-3 h-8">
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">History</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-card border-r border-border p-0 shadow-xl">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-sm font-black uppercase tracking-widest">Archives</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <Button
                    onClick={startNewConversation}
                    className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold uppercase tracking-widest text-[9px] h-9"
                  >
                    <Plus className="h-3.5 w-3.5 mr-2" /> New Interaction
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
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
              <div className="w-20 h-20 border border-border bg-muted/20 flex items-center justify-center shadow-none group">
                <Bolt className="h-8 w-8 text-primary" />
              </div>
              <div className="max-w-md space-y-3">
                <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Advisor Terminal</h2>
                <div className="h-px w-12 bg-primary mx-auto" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Strategic Wealth Synthesis & Audit Engine</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 max-w-xl">
                {["Analyze Spending", "Project Net Worth", "Wealth Trajectory"].map((qs) => (
                  <button
                    key={qs}
                    onClick={() => { setInputMessage(qs); inputRef.current?.focus(); }}
                    className="text-[9px] font-black uppercase tracking-widest px-6 py-3 border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
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
                  <div className={`text-sm leading-relaxed relative break-words overflow-hidden ${message.role === 'USER'
                    ? 'bg-primary text-primary-foreground px-5 py-4 rounded-none border-none inline-block text-left tracking-tight font-black uppercase'
                    : 'border border-border bg-card border-l-4 border-l-primary p-6 rounded-none shadow-none text-foreground/90 font-medium'
                    }`}>
                    {message.role === 'ASSISTANT' ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <span className="opacity-95">{message.content}</span>
                    )}
                  </div>

                  {message.chartConfig && (
                    <div className="mt-4 w-full h-[280px] border border-border bg-card rounded-none p-6 shadow-none">
                      <ChartMessage config={message.chartConfig} />
                    </div>
                  )}

                  <div className={`flex items-center gap-2 mt-2 px-1 ${message.role === 'USER' ? 'justify-end' : ''}`}>
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-30">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} className="h-10" />
        </div>

        {/* Input area - Industrial Fixed Bar */}
        <div className="p-6 md:p-10 border-t border-border bg-card">
          <div className="relative max-w-4xl mx-auto">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Inject strategic query..."
              disabled={loading}
              className="w-full bg-muted/20 border-border hover:border-primary/50 rounded-none py-6 pl-6 pr-24 text-xs text-foreground placeholder:text-muted-foreground/30 shadow-none transition-all h-auto font-bold uppercase tracking-widest"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                size="icon"
                className="bg-primary text-primary-foreground h-10 w-10 rounded-none hover:bg-primary/90 shadow-none hover:scale-100 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5 font-black" />}
              </Button>
            </div>
          </div>
          <p className="text-center text-[8px] text-muted-foreground/40 mt-6 uppercase tracking-[0.4em] font-black pointer-events-none select-none">
            Secure Audit Terminal Node • v5.0.2-INDUSTRIAL
          </p>
        </div>
      </section>
    </div>
  );
}
