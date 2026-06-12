'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavPill, NavPillGroup } from '@/components/ui/nav-pill';
import {
  Loader2,
  Share,
  Mic,
  ArrowUp,
  Bolt,
  History,
  Plus,
  Trash2,
  Moon,
  Sun,
} from 'lucide-react';
import PageSkeleton from '@/components/feedback/page-skeleton';
import { MarkdownRenderer } from '@/features/advisor/components/markdown-renderer';
import { FinancialInsightsPanel } from '@/features/advisor/components/financial-insights-panel';
import { TabPanelTransition } from '@/components/motion/tab-panel';
import { useMobileRefreshRegister } from '@/contexts/MobileRefreshContext';
import { ChartMessage, ChartConfig } from '@/features/advisor/components/chart-message';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRouteBootstrap } from '@/hooks/use-route-bootstrap';
import type { AdvisorInsightsPayload } from '@/lib/dashboard-insights';

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

type AdvisorMode = 'insights' | 'ai';

interface AdvisorPageProps {
  initialInsights: import('@/lib/dashboard-insights').AdvisorInsightsPayload;
}

export default function AdvisorPage({ initialInsights }: AdvisorPageProps) {
  const { user, loading: authLoading } = useAuth();
  const cachedInsights = useRouteBootstrap('/advisor', initialInsights);
  const { setTheme, isLoading: themeLoading, isDark } = useTheme();
  const isDarkMode = !themeLoading && isDark;
  const [mode, setMode] = useState<AdvisorMode>('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const insightsRefreshRef = useRef<(() => Promise<void>) | null>(null);

  const registerInsightsRefresh = useCallback((refetch: () => Promise<void>) => {
    insightsRefreshRef.current = refetch;
  }, []);

  const openAiWithPrompt = useCallback((prompt: string) => {
    setInputMessage(prompt);
    setMode('ai');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

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

  useMobileRefreshRegister(
    useCallback(async () => {
      if (mode === 'insights') {
        await insightsRefreshRef.current?.();
      } else {
        await fetchConversations();
      }
    }, [mode, fetchConversations]),
    '/advisor',
  );

  useEffect(() => {
    async function fetchMessages(id: string) {
      try {
        const response = await fetch(`/api/advisor/conversations/${id}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.conversation?.messages || []);
        }
      } catch (e) {
        console.error('Failed to load conversation', e);
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
    if (mode === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setHistoryOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
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
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        return [...filtered, ...assistantMessages];
      });
    } catch (error) {
      console.error('Chat error', error);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        return [
          ...filtered,
          {
            id: 'error-' + Date.now(),
            role: 'ASSISTANT',
            content: "I'm having trouble connecting right now. Please try again.",
            createdAt: new Date().toISOString(),
          },
        ];
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
          <p className="text-muted">Please sign in to access your advisor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background text-foreground">
      <header className="safe-top shrink-0 border-b border-border bg-background px-4 lg:px-6">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-foreground">Advisor</h1>
            <p className="text-xs text-hint">
              {mode === 'insights' ? 'Your financial overview this month' : 'Ask AI about your finances'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
          {mode === 'ai' && (
            <div className="flex items-center gap-1 md:gap-2">
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
                        conversations.map((conv) => (
                          <div
                            key={conv.id}
                            onClick={() => {
                              setCurrentConversationId(conv.id);
                              setHistoryOpen(false);
                            }}
                            className={cn(
                              'group relative cursor-pointer rounded-md border p-4 transition-colors hover:bg-surface',
                              currentConversationId === conv.id ? 'border-border bg-surface' : 'border-transparent',
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
          )}
            <button
              type="button"
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              className="btn-touch flex size-9 items-center justify-center rounded-full border border-border/60 text-muted hover:bg-surface hover:text-foreground lg:hidden"
              aria-label="Toggle theme"
              suppressHydrationWarning
            >
              {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
          </div>
        </div>
        <div className="pb-3">
          <NavPillGroup className="w-full max-w-xs">
            <NavPill label="Insights" active={mode === 'insights'} onClick={() => setMode('insights')} />
            <NavPill label="AI Chat" active={mode === 'ai'} onClick={() => setMode('ai')} />
          </NavPillGroup>
        </div>
      </header>

      <TabPanelTransition panelKey={mode}>
      {mode === 'insights' ? (
        <FinancialInsightsPanel
          insights={cachedInsights}
          onPromptSelect={openAiWithPrompt}
          onRegisterRefresh={registerInsightsRefresh}
        />
      ) : (
        <section className="relative flex flex-col bg-background">
          <div className="space-y-8 p-4 pb-[calc(var(--app-bottom-inset)+5.5rem)] sm:p-6">
            {loading && messages.length === 0 ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-xs text-muted">Loading conversation…</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-md border border-border bg-surface">
                  <Bolt className="size-7 text-primary" />
                </div>
                <div className="max-w-md space-y-2">
                  <h2 className="text-2xl font-medium text-foreground">AI Chat</h2>
                  <p className="text-sm text-muted">
                    Ask follow-up questions about your spending, plan, or goals.
                  </p>
                </div>
                <div className="flex max-w-xl flex-wrap justify-center gap-3">
                  {['Analyze my spending this month', 'Show my savings gap', 'Summarize my financial health'].map(
                    (qs) => (
                      <button
                        key={qs}
                        type="button"
                        onClick={() => {
                          setInputMessage(qs);
                          inputRef.current?.focus();
                        }}
                        className="rounded-md border border-border bg-card px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                      >
                        {qs}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex w-full animate-in fade-in duration-500',
                    message.role === 'USER' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div className={cn('max-w-[90%] space-y-4 md:max-w-xl', message.role === 'USER' ? 'text-right' : '')}>
                    <div
                      className={cn(
                        'relative break-words text-sm leading-relaxed',
                        message.role === 'USER'
                          ? 'inline-block rounded-md bg-primary px-4 py-3 text-left text-primary-foreground'
                          : 'card-base p-5 text-foreground',
                      )}
                    >
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
            <div ref={messagesEndRef} />
          </div>
        </section>
      )}
      </TabPanelTransition>

      {mode === 'ai' && (
        <div className="fixed inset-x-0 bottom-[calc(var(--app-bottom-inset)+0.25rem)] z-30 shrink-0 p-3 glass-mobile-bar glass-chrome-text lg:static lg:bottom-auto lg:p-4 lg:pb-6">
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
      )}
    </div>
  );
}
