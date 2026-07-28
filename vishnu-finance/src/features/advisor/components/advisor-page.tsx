'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Mic,
  ArrowUp,
  Bolt,
  History,
  Plus,
  Trash2,
  Square,
  RotateCcw,
} from 'lucide-react';
import PageSkeleton from '@/components/feedback/page-skeleton';
import { MarkdownRenderer } from '@/features/advisor/components/markdown-renderer';
import { AdvisorExportActions } from '@/features/advisor/components/advisor-export-actions';
import { AdvisorQuotaBanner } from '@/features/advisor/components/advisor-quota-banner';
import type { GeminiQuotaStatus } from '@/lib/gemini-quota';
import { FinancialInsightsPanel } from '@/features/advisor/components/financial-insights-panel';
import { TabPanelTransition } from '@/components/motion/tab-panel';
import { useMobileRefreshRegister } from '@/contexts/MobileRefreshContext';
import {
  InteractiveArtifactsList,
  hydrateArtifactsFromMessage,
} from '@/features/advisor/components/interactive-artifact-host';
import type { AdvisorArtifact } from '@/lib/advisor-artifacts/types';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRouteBootstrap } from '@/hooks/use-route-bootstrap';
import { MobileStickyTabs } from '@/components/ui/mobile-sticky-tabs';
import { PageMandate } from '@/components/layout/page-mandate';
import { MobileScrollEndSpacer } from '@/components/layout/mobile-scroll-end-spacer';
import { patterns } from '@/design/patterns';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: Array<{
    type?: string;
    id?: string;
    title?: string;
    url?: string;
    kind?: string;
    payload?: unknown;
    chartConfig?: import('@/lib/advisor-chart-types').ChartConfig;
  }>;
  createdAt: string;
  artifacts?: AdvisorArtifact[];
  /** @deprecated Prefer artifacts */
  chartConfig?: import('@/lib/advisor-chart-types').ChartConfig;
  requestedFormat?: string;
  attachment?: {
    format: 'csv' | 'html' | 'xlsx' | 'pdf' | 'docx';
    filename: string;
    mimeType: string;
    base64: string;
  };
  provider?: 'gemini' | 'groq';
  providerNotice?: string;
  groqRateLimit?: {
    remainingRequests?: number;
    limitRequests?: number;
    remainingTokens?: number;
    limitTokens?: number;
    resetRequests?: string;
    resetTokens?: string;
    message: string;
    model?: string;
  };
  followUps?: string[];
  turnStatus?: string;
  /** Failed turn — show Retry */
  failed?: boolean;
  retryPrompt?: string;
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

const MODE_TABS = [
  { id: 'insights', label: 'Insights' },
  { id: 'ai', label: 'AI Chat', shortLabel: 'Chat' },
] as const;

export default function AdvisorPage({ initialInsights }: AdvisorPageProps) {
  const { user, loading: authLoading } = useAuth();
  const cachedInsights = useRouteBootstrap('/advisor', initialInsights, { userId: user?.id });
  const [mode, setMode] = useState<AdvisorMode>('insights');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [quotaStatus, setQuotaStatus] = useState<GeminiQuotaStatus | null>(null);
  const [activeProvider, setActiveProvider] = useState<'gemini' | 'groq' | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [groqLimits, setGroqLimits] = useState<Message['groqRateLimit'] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userRateLimitNotice, setUserRateLimitNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const insightsRefreshRef = useRef<(() => Promise<void>) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef<string | null>(null);

  const registerInsightsRefresh = useCallback((refetch: () => Promise<void>) => {
    insightsRefreshRef.current = refetch;
  }, []);

  const openAiWithPrompt = useCallback((prompt: string) => {
    setInputMessage(prompt);
    setMode('ai');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/advisor/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
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
    let cancelled = false;
    async function loadQuota() {
      try {
        const res = await fetch('/api/advisor/quota');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.quota) setQuotaStatus(data.quota);
        if (!cancelled && data.activeProvider) setActiveProvider(data.activeProvider);
        if (!cancelled && data.groq) setGroqLimits(data.groq);
        if (!cancelled && data.note && data.activeProvider === 'groq') {
          setProviderNotice(data.note);
        }
      } catch {
        /* ignore */
      }
    }
    void loadQuota();
    const id = window.setInterval(loadQuota, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    async function fetchMessages(id: string) {
      try {
        const response = await fetch(`/api/advisor/conversations/${id}`);
        if (response.ok) {
          const data = await response.json();
          const raw = (data.conversation?.messages || []) as Message[];
          setMessages(
            raw.map((m) => {
              const artifacts = hydrateArtifactsFromMessage(m);
              return artifacts.length ? { ...m, artifacts } : m;
            }),
          );
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

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  };

  const sendMessage = async (overrideText?: string) => {
    const messageText = (overrideText ?? inputMessage).trim();
    if (!messageText || loading) return;

    if (!overrideText) setInputMessage('');
    setLoading(true);
    setUserRateLimitNotice(null);
    lastPromptRef.current = messageText;

    const tempUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'USER',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    const tempAssistant: Message = {
      id: tempAssistantId,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage, tempAssistant]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: messageText,
          conversationId: currentConversationId,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => null)) as {
          error?: string;
          code?: string;
          quota?: GeminiQuotaStatus;
          groq?: Message['groqRateLimit'];
          retryAfterSec?: number;
        } | null;
        if (errBody?.quota) setQuotaStatus(errBody.quota);
        if (errBody?.groq) {
          setGroqLimits(errBody.groq);
          setActiveProvider('groq');
        }
        if (errBody?.code === 'USER_RATE_LIMIT') {
          setUserRateLimitNotice(
            errBody.error ||
              `Rate limited. Retry in ~${errBody.retryAfterSec ?? '?'}s.`,
          );
        }
        const retryHint =
          errBody?.retryAfterSec != null && errBody.retryAfterSec > 0
            ? ` Retry in ~${errBody.retryAfterSec}s.`
            : '';
        throw new Error((errBody?.error || 'Failed to send message') + retryHint);
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventName = 'message';

        const applyDonePayload = (data: {
          conversation?: { id?: string; isNew?: boolean };
          messages?: Message[];
        }) => {
          if (data.conversation?.id) {
            if (data.conversation.id !== currentConversationId) {
              setCurrentConversationId(data.conversation.id);
              void fetchConversations();
            }
          }
          const assistantMessages = (data.messages || []) as Message[];
          const lastAssistant = [...assistantMessages]
            .reverse()
            .find((m) => m.role === 'ASSISTANT');
          if (lastAssistant?.provider) setActiveProvider(lastAssistant.provider);
          if (lastAssistant?.providerNotice) setProviderNotice(lastAssistant.providerNotice);
          if (lastAssistant?.groqRateLimit) setGroqLimits(lastAssistant.groqRateLimit);

          setMessages((prev) => {
            const filtered = prev.filter(
              (m) => m.id !== tempUserMessage.id && m.id !== tempAssistantId,
            );
            return [
              ...filtered,
              ...assistantMessages.map((m) => {
                const artifacts = hydrateArtifactsFromMessage(m);
                return artifacts.length ? { ...m, artifacts } : m;
              }),
            ];
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';

          for (const line of parts) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
              continue;
            }
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (eventName === 'token' && typeof data.text === 'string') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId
                    ? { ...m, content: m.content + data.text }
                    : m,
                ),
              );
            } else if (eventName === 'status' && typeof data.turnStatus === 'string') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId
                    ? { ...m, turnStatus: data.turnStatus as string }
                    : m,
                ),
              );
            } else if (eventName === 'artifact' && Array.isArray(data.artifacts)) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId
                    ? { ...m, artifacts: data.artifacts as AdvisorArtifact[] }
                    : m,
                ),
              );
            } else if (eventName === 'done') {
              applyDonePayload(data as {
                conversation?: { id?: string; isNew?: boolean };
                messages?: Message[];
              });
            } else if (eventName === 'error') {
              if (data.quota) setQuotaStatus(data.quota as GeminiQuotaStatus);
              if (data.groq) {
                setGroqLimits(data.groq as Message['groqRateLimit']);
                setActiveProvider('groq');
              }
              throw new Error(String(data.error || 'Stream failed'));
            }
            eventName = 'message';
          }
        }
      } else {
        // JSON fallback
        const data = await response.json();
        if (data.conversation?.id) {
          if (data.conversation.id !== currentConversationId) {
            setCurrentConversationId(data.conversation.id);
            void fetchConversations();
          }
        }
        const assistantMessages = (data.messages || []) as Message[];
        const lastAssistant = [...assistantMessages].reverse().find((m) => m.role === 'ASSISTANT');
        if (lastAssistant?.provider) setActiveProvider(lastAssistant.provider);
        if (lastAssistant?.providerNotice) setProviderNotice(lastAssistant.providerNotice);
        if (lastAssistant?.groqRateLimit) setGroqLimits(lastAssistant.groqRateLimit);

        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => m.id !== tempUserMessage.id && m.id !== tempAssistantId,
          );
          return [
            ...filtered,
            ...assistantMessages.map((m) => {
              const artifacts = hydrateArtifactsFromMessage(m);
              return artifacts.length ? { ...m, artifacts } : m;
            }),
          ];
        });
      }
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  content: m.content || '_Stopped._',
                  failed: true,
                  retryPrompt: messageText,
                }
              : m,
          ),
        );
      } else {
        console.error('Chat error', error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : "I'm having trouble connecting right now. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  content: message,
                  failed: true,
                  retryPrompt: messageText,
                }
              : m,
          ),
        );
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
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

  const insightMetrics = (cachedInsights?.dynamicInsights ?? []).slice(0, 2).map((insight) => ({
    label: insight.type === 'warning' ? 'Alert' : 'Insight',
    value: insight.message.length > 28 ? `${insight.message.slice(0, 28)}…` : insight.message,
    tone: (insight.type === 'warning'
      ? 'warning'
      : insight.type === 'positive'
        ? 'success'
        : 'default') as 'warning' | 'success' | 'default',
  }));

  return (
    <div className={cn(patterns.pageColumn, 'min-w-0 pb-8')}>
      <div className="mb-2 shrink-0 lg:mb-3">
        <PageMandate
          className="min-w-0"
          hideTitleOnMobile
          title="Advisor"
          mandate={
            mode === 'insights'
              ? 'Month pulse, plan score, and prompts for AI.'
              : 'Ask follow-ups about spending, plan, or goals.'
          }
          metrics={
            mode === 'insights' && insightMetrics.length > 0
              ? insightMetrics
              : [
                  {
                    label: 'Plan score',
                    value: `${Math.round(cachedInsights?.adherence?.overallScore ?? 0)}%`,
                  },
                  {
                    label: 'Spent of plan',
                    value: `${Math.round(cachedInsights?.spendingContext?.spentOfPlanPercent ?? 0)}%`,
                  },
                ]
          }
        />
      </div>

      <MobileStickyTabs
        tabs={[...MODE_TABS]}
        activeId={mode}
        onChange={(id) => setMode(id as AdvisorMode)}
        underGlobalTopBar
        stickyOnDesktop
        glass
        className="mb-3 lg:mb-4"
        trailing={
          mode === 'ai' ? (
            <>
              <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 bg-surface/80 px-2.5">
                    <History className="size-3.5" />
                    <span className="hidden sm:inline">History</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] border-r border-border/70 bg-card p-0 sm:w-[400px]">
                  <SheetHeader className="border-b border-border/60 p-4">
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
                              'group relative cursor-pointer rounded-xl border p-3 transition-colors hover:bg-surface',
                              currentConversationId === conv.id
                                ? 'border-border/70 bg-surface'
                                : 'border-transparent',
                            )}
                          >
                            <p className="line-clamp-1 text-sm font-medium text-foreground">{conv.title}</p>
                            <p className="mt-1 text-xs text-muted">
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
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 bg-surface/80 px-2.5"
                onClick={startNewConversation}
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">New</span>
              </Button>
            </>
          ) : null
        }
      />

      <TabPanelTransition panelKey={mode}>
        {mode === 'insights' ? (
          <FinancialInsightsPanel
            insights={cachedInsights}
            onPromptSelect={openAiWithPrompt}
            onRegisterRefresh={registerInsightsRefresh}
          />
        ) : (
          <section className="relative flex flex-col">
            <div className="mx-auto w-full max-w-3xl space-y-5 pb-[calc(4.5rem+var(--app-bottom-inset))] lg:pb-4">
              {userRateLimitNotice ? (
                <p className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-xs text-foreground">
                  {userRateLimitNotice}
                </p>
              ) : null}
              {quotaStatus || activeProvider === 'groq' || providerNotice ? (
                <AdvisorQuotaBanner
                  quota={quotaStatus}
                  groq={groqLimits}
                  activeProvider={activeProvider}
                  providerNotice={providerNotice}
                  className="sticky top-0 z-10"
                />
              ) : null}
              {loading && messages.length === 0 ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-primary opacity-50" />
                  <p className="mt-4 text-xs text-muted">Loading conversation…</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-6 text-center">
                  <Bolt className="size-8 text-muted" />
                  <p className="max-w-md text-sm text-muted">
                    Ask about spending, plan adherence, or goals — grounded in your data.
                  </p>
                  <div className="flex max-w-xl flex-wrap justify-center gap-1.5">
                    {[
                      'Planned vs actual this month in a table',
                      'Show spending as a line chart',
                      'Export budget vs actual as Excel',
                    ].map((qs) => (
                      <Button
                        key={qs}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 bg-surface px-2.5 text-xs"
                        onClick={() => {
                          setInputMessage(qs);
                          inputRef.current?.focus();
                        }}
                      >
                        {qs}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex w-full animate-in fade-in duration-300',
                      message.role === 'USER' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'min-w-0 space-y-1.5',
                        message.role === 'USER' ? 'max-w-[85%] sm:max-w-[75%]' : 'w-full',
                      )}
                    >
                      {message.role === 'USER' ? (
                        <div className="rounded-2xl bg-primary px-3.5 py-2.5 text-left text-sm leading-relaxed text-primary-foreground">
                          {message.content}
                        </div>
                      ) : (
                        <div className="text-[15px] leading-7 text-foreground">
                          {message.turnStatus ? (
                            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted">
                              {message.turnStatus}
                            </p>
                          ) : null}
                          {message.providerNotice ? (
                            <p className="mb-2 text-xs text-muted">{message.providerNotice}</p>
                          ) : null}
                          {message.content ? (
                            <MarkdownRenderer content={message.content} />
                          ) : loading ? (
                            <p className="flex items-center gap-2 text-sm text-muted">
                              <Loader2 className="size-3.5 animate-spin" /> Thinking…
                            </p>
                          ) : null}
                          {message.failed && message.retryPrompt ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-8 gap-1.5 text-xs"
                              onClick={() => void sendMessage(message.retryPrompt)}
                            >
                              <RotateCcw className="size-3.5" /> Retry
                            </Button>
                          ) : null}
                          {message.content ? (
                            <AdvisorExportActions
                              markdown={message.content}
                              title="Advisor export"
                              attachment={message.attachment}
                              autoOpenPreview={Boolean(message.attachment)}
                            />
                          ) : null}
                          <InteractiveArtifactsList
                            artifacts={
                              message.artifacts?.length
                                ? message.artifacts
                                : hydrateArtifactsFromMessage(message)
                            }
                          />
                          {message.followUps && message.followUps.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {message.followUps.map((chip) => (
                                <Button
                                  key={chip}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 bg-surface px-2.5 text-xs"
                                  onClick={() => void sendMessage(chip)}
                                >
                                  {chip}
                                </Button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}

                      <p
                        className={cn(
                          'text-[11px] text-muted',
                          message.role === 'USER' ? 'text-right' : 'text-left',
                        )}
                      >
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </section>
        )}
      </TabPanelTransition>

      {mode === 'insights' ? <MobileScrollEndSpacer /> : null}

      {mode === 'ai' && (
        <div className="fixed inset-x-0 bottom-[calc(var(--app-bottom-inset)+0.25rem)] z-30 shrink-0 p-3 glass-mobile-bar glass-chrome-text lg:sticky lg:bottom-0 lg:inset-x-auto lg:mt-3 lg:border-t-0 lg:p-3 lg:glass-chrome">
          <div className="relative mx-auto max-w-3xl">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question about your finances…"
              disabled={loading}
              className="h-12 border-border/40 bg-background/40 pr-24 text-sm backdrop-blur-sm"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <Button variant="ghost" size="icon" className="size-9 text-muted" disabled>
                <Mic className="size-4" />
              </Button>
              {loading ? (
                <Button
                  onClick={stopStreaming}
                  size="icon"
                  variant="secondary"
                  className="size-9"
                  title="Stop"
                >
                  <Square className="size-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  onClick={() => void sendMessage()}
                  disabled={!inputMessage.trim()}
                  size="icon"
                  className="size-9"
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
