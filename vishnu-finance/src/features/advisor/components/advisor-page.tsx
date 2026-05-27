'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Share,
  Mic,
  ArrowUp,
  Bolt,
  History,
  Plus,
  Trash2,
  Lightbulb,
} from 'lucide-react';
import PageSkeleton from '@/components/feedback/page-skeleton';
import { MarkdownRenderer } from '@/features/advisor/components/markdown-renderer';
import { InsightSidebar } from '@/features/advisor/components/insight-sidebar';
import { ChartMessage, ChartConfig } from '@/features/advisor/components/chart-message';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { cn } from '@/lib/utils';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (user && !authLoading) {
      fetchConversations();
    }
  }, [user, authLoading, fetchConversations]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setHistoryOpen(false);
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
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-medium text-foreground">Welcome back</h1>
          <p className="text-muted">Please sign in to access your AI advisor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col overflow-hidden bg-background text-foreground xl:min-h-[calc(100dvh-6rem)] xl:flex-row">
      <div className="hidden h-full shrink-0 border-r border-border xl:block xl:w-72">
        <InsightSidebar userId={user.id} className="h-full" />
      </div>

      <section className="relative flex min-w-0 flex-1 flex-col bg-background">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <div>
            <h1 className="text-sm font-medium text-foreground">AI Advisor</h1>
            <p className="text-xs text-hint">Ask questions about your finances</p>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 px-2 xl:hidden md:px-3"
              onClick={() => setInsightsOpen(true)}
            >
              <Lightbulb className="size-3.5" />
              <span className="hidden sm:inline text-xs">Insights</span>
            </Button>
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2 md:px-3">
                  <History className="size-3.5" />
                  <span className="hidden sm:inline text-xs">History</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] border-r border-border bg-card p-0 sm:w-[400px]">
                <SheetHeader className="border-b border-border p-4">
                  <SheetTitle className="text-sm font-medium">Conversation history</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <Button onClick={startNewConversation} className="mb-4 w-full" size="sm">
                    <Plus className="mr-2 size-3.5" /> New conversation
                  </Button>
                  <div className="max-h-[calc(100vh-180px)] space-y-2 overflow-y-auto custom-scrollbar">
                    {conversations.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted">No conversations yet</p>
                    ) : (
                      conversations.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => { setCurrentConversationId(conv.id); setHistoryOpen(false); }}
                          className={cn(
                            'group relative cursor-pointer rounded-md border p-4 transition-colors hover:bg-surface',
                            currentConversationId === conv.id ? 'border-border bg-surface' : 'border-transparent'
                          )}
                        >
                          <p className="line-clamp-1 text-sm font-medium text-foreground">{conv.title}</p>
                          <p className="mt-1 text-xs text-hint">
                            {new Date(conv.updatedAt).toLocaleDateString()} · {conv.messageCount} messages
                          </p>
                          <button
                            onClick={(e) => deleteConversation(e, conv.id)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" className="size-9 text-muted hover:text-foreground">
              <Share className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-8 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          {loading && messages.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary opacity-50" />
              <p className="mt-4 text-xs text-muted">Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-md border border-border bg-surface">
                <Bolt className="size-7 text-primary" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-2xl font-medium text-foreground">How can I help?</h2>
                <p className="text-sm text-muted">Ask about spending, projections, or financial planning.</p>
              </div>
              <div className="flex max-w-xl flex-wrap justify-center gap-3">
                {["Analyze spending", "Project net worth", "Wealth trajectory"].map((qs) => (
                  <button
                    key={qs}
                    type="button"
                    onClick={() => { setInputMessage(qs); inputRef.current?.focus(); }}
                    className="rounded-md border border-border bg-card px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
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
                className={cn('flex w-full animate-in fade-in duration-500', message.role === 'USER' ? 'justify-end' : 'justify-start')}
              >
                <div className={cn('max-w-[90%] space-y-4 md:max-w-xl', message.role === 'USER' ? 'text-right' : '')}>
                  <div className={cn(
                    'relative break-words text-sm leading-relaxed',
                    message.role === 'USER'
                      ? 'inline-block rounded-md bg-primary px-4 py-3 text-left text-primary-foreground'
                      : 'card-base p-5 text-foreground'
                  )}>
                    {message.role === 'ASSISTANT' ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>

                  {message.chartConfig && (
                    <div className="mt-4 h-[200px] w-full md:h-[280px]">
                      <ChartMessage config={message.chartConfig} />
                    </div>
                  )}

                  <div className={cn('mt-2 flex items-center gap-2 px-1', message.role === 'USER' ? 'justify-end' : '')}>
                    <span className="text-[11px] text-hint">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} className="h-10" />
        </div>

        <div className="border-t border-border bg-background p-4 md:p-6">
          <div className="relative mx-auto max-w-4xl">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question about your finances…"
              disabled={loading}
              className="h-12 border-border bg-card pr-24 text-sm"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <Button variant="ghost" size="icon" className="size-9 text-muted" disabled>
                <Mic className="size-4" />
              </Button>
              <Button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                size="icon"
                className="size-9"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ResponsiveSheet
        open={insightsOpen}
        onOpenChange={setInsightsOpen}
        title="Financial insights"
        description="Context from your accounts and spending patterns"
        desktopSide="right"
        contentClassName="p-0 xl:hidden"
      >
        <InsightSidebar userId={user.id} className="h-full min-h-[50vh]" />
      </ResponsiveSheet>
    </div>
  );
}
