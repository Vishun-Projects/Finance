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
      fetchMessages(currentConversationId);
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
      <section className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 flex items-center justify-center">
              {/* Mobile Handler can go here if needed */}
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">AI Wealth Advisor</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Portfolio Synced</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">History</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-background border-r border-border p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-sm font-bold uppercase tracking-widest">Chat History</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <Button
                    onClick={startNewConversation}
                    className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" /> New Chat
                  </Button>
                  <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
                    {conversations.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No conversations yet.</p>
                    ) : (
                      conversations.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => { setCurrentConversationId(conv.id); setHistoryOpen(false); }}
                          className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-all group relative ${currentConversationId === conv.id ? 'bg-muted border-foreground/10' : 'border-transparent'
                            }`}
                        >
                          <p className="text-sm font-medium text-foreground line-clamp-1">{conv.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(conv.updatedAt).toLocaleDateString()} • {conv.messageCount} messages
                          </p>
                          <button
                            onClick={(e) => deleteConversation(e, conv.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all text-muted-foreground"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted">
              <Share className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-0 animate-in fade-in duration-700">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
                <Bolt className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-xl font-bold text-foreground">How can I help you today?</h2>
                <p className="text-sm text-muted-foreground">I can analyze your spending, project your net worth, or suggest tax optimization strategies.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {["Analyze Q1 Spending", "Project Net Worth", "Tax Harvest Opportunities"].map((qs) => (
                  <button
                    key={qs}
                    onClick={() => { setInputMessage(qs); inputRef.current?.focus(); }}
                    className="text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
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
                className={`flex gap-4 max-w-3xl ${message.role === 'USER' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${message.role === 'ASSISTANT'
                  ? 'bg-card border-border'
                  : 'bg-primary border-primary overflow-hidden'
                  }`}>
                  {message.role === 'ASSISTANT' ? <Bolt className="h-4 w-4 text-foreground" /> : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-primary-foreground font-bold">You</div>
                  )}
                </div>

                <div className={`space-y-4 max-w-[85%] ${message.role === 'USER' ? 'text-right' : ''}`}>
                  <div className={`text-sm leading-relaxed ${message.role === 'USER'
                    ? 'bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tr-none inline-block text-left shadow-sm'
                    : 'text-muted-foreground'
                    }`}>
                    {message.role === 'ASSISTANT' ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>

                  {message.chartConfig && (
                    <div className="mt-4 w-full h-64">
                      <ChartMessage config={message.chartConfig} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 bg-background border-t border-border">
          <div className="relative max-w-4xl mx-auto">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about your portfolio, taxes, or future goals..."
              disabled={loading}
              className="w-full bg-muted/50 border-input rounded-2xl py-6 pl-6 pr-24 focus-visible:ring-1 focus-visible:ring-ring text-sm text-foreground placeholder:text-muted-foreground shadow-lg"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" disabled>
                <Mic className="h-5 w-5" />
              </Button>
              <Button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                size="icon"
                className="bg-foreground text-background h-9 w-9 rounded-xl hover:bg-foreground/80 shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5 font-bold" />}
              </Button>
            </div>
          </div>
          <p className="text-center text-[9px] text-muted-foreground mt-4 uppercase tracking-[0.2em] font-bold">Encrypted End-to-End • Verified Financial Model v4.2</p>
        </div>
      </section>
    </div>
  );
}
