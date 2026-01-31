'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Send,
  Loader2,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  MoreVertical,
  X,
  Menu,
  RotateCcw,
} from 'lucide-react';
import PageSkeleton from '@/components/feedback/page-skeleton';
import { MarkdownRenderer } from '@/components/markdown-renderer';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: Array<{ type: 'document' | 'internet'; id?: string; title?: string; url?: string }>;
  createdAt: string;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingConversationTitle, setEditingConversationTitle] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editTitleRef = useRef<HTMLInputElement>(null);
  const editMessageRef = useRef<HTMLTextAreaElement>(null);

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
    if (currentConversationId) {
      fetchConversation(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (editingConversationId && editTitleRef.current) {
      editTitleRef.current.focus();
      editTitleRef.current.select();
    }
  }, [editingConversationId]);

  useEffect(() => {
    if (editingMessageId && editMessageRef.current) {
      editMessageRef.current.focus();
      editMessageRef.current.setSelectionRange(
        editMessageRef.current.value.length,
        editMessageRef.current.value.length
      );
    }
  }, [editingMessageId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/advisor/conversations/${conversationId}`, {
        credentials: 'include', // Ensure cookies are sent
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch conversation' }));
        throw new Error(errorData.error || `Failed to fetch conversation (${response.status})`);
      }
      const data = await response.json();
      setMessages(data.conversation.messages || []);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  };

  const createNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInputMessage('');
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const response = await fetch(`/api/advisor/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete conversation');
      await fetchConversations();
      if (currentConversationId === conversationId) {
        createNewConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/advisor/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!response.ok) throw new Error('Failed to rename conversation');
      await fetchConversations();
      setEditingConversationId(null);
    } catch (error) {
      console.error('Error renaming conversation:', error);
      alert('Failed to rename conversation');
    }
  };

  const startEditingConversation = (conv: Conversation) => {
    setEditingConversationId(conv.id);
    setEditingConversationTitle(conv.title || '');
  };

  const cancelEditingConversation = () => {
    setEditingConversationId(null);
    setEditingConversationTitle('');
  };

  const saveEditingConversation = () => {
    if (editingConversationId && editingConversationTitle.trim()) {
      renameConversation(editingConversationId, editingConversationTitle);
    }
  };

  const updateMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const response = await fetch(`/api/advisor/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      if (!response.ok) throw new Error('Failed to update message');

      const data = await response.json();

      // Find the message index
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      // Update the message in state
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: data.message.content };

      // Find and remove the assistant's response that follows this user message
      // (if it exists and is the next message)
      if (messageIndex + 1 < updatedMessages.length && updatedMessages[messageIndex + 1].role === 'ASSISTANT') {
        const assistantMessageId = updatedMessages[messageIndex + 1].id;
        // Delete the assistant message from database
        try {
          await fetch(`/api/advisor/messages/${assistantMessageId}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error deleting assistant message:', error);
        }
        // Remove from state
        updatedMessages.splice(messageIndex + 1, 1);
      }

      setMessages(updatedMessages);
      setEditingMessageId(null);
      setEditingMessageContent('');

      // Regenerate AI response with the updated message
      // Refresh the conversation first to get the updated message from database
      if (currentConversationId) {
        await fetchConversation(currentConversationId);
      }

      // Regenerate the assistant's response using the regenerate endpoint
      setLoading(true);
      try {
        const regenerateResponse = await fetch('/api/advisor/regenerate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: currentConversationId,
            userMessageId: messageId,
          }),
        });

        if (!regenerateResponse.ok) {
          const errorData = await regenerateResponse.json().catch(() => ({ error: 'Failed to regenerate response' }));
          throw new Error(errorData.error || `Failed to regenerate response (${regenerateResponse.status})`);
        }

        const regenerateData = await regenerateResponse.json();

        // Update messages: replace the assistant message that follows the updated user message
        setMessages((prev) => {
          const userMsgIndex = prev.findIndex((m) => m.id === messageId);
          if (userMsgIndex === -1) return prev;

          const newMessages = [...prev];
          const assistantMessage = regenerateData.message;

          // Replace or insert the assistant message
          if (userMsgIndex + 1 < newMessages.length && newMessages[userMsgIndex + 1].role === 'ASSISTANT') {
            newMessages[userMsgIndex + 1] = assistantMessage;
          } else {
            newMessages.splice(userMsgIndex + 1, 0, assistantMessage);
          }

          return newMessages;
        });
      } catch (error) {
        console.error('Error regenerating response:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate response. Please try again.';
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating message:', error);
      alert('Failed to update message');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`/api/advisor/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete message');

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      await fetchConversations();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const startEditingMessage = (message: Message) => {
    if (message.role !== 'USER') return;
    setEditingMessageId(message.id);
    setEditingMessageContent(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageContent('');
  };

  const saveEditingMessage = () => {
    if (editingMessageId && editingMessageContent.trim()) {
      updateMessage(editingMessageId, editingMessageContent);
    }
  };

  const regenerateResponse = async (messageId: string) => {
    // Find the assistant message and its corresponding user message
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== 'ASSISTANT') return;

    // Find the previous user message
    let userMessageIndex = -1;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'USER') {
        userMessageIndex = i;
        break;
      }
    }

    if (userMessageIndex === -1 || !currentConversationId) return;

    const userMessage = messages[userMessageIndex];

    // Delete the assistant message and regenerate using the regenerate endpoint
    setLoading(true);
    try {
      const regenerateResponse = await fetch('/api/advisor/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
          userMessageId: userMessage.id,
        }),
      });

      if (!regenerateResponse.ok) {
        const errorData = await regenerateResponse.json().catch(() => ({ error: 'Failed to regenerate response' }));
        throw new Error(errorData.error || `Failed to regenerate response (${regenerateResponse.status})`);
      }

      const regenerateData = await regenerateResponse.json();

      // Replace the assistant message with the new one
      setMessages((prev) => {
        const msgIndex = prev.findIndex((m) => m.id === messageId);
        if (msgIndex === -1) return prev;

        const newMessages = [...prev];
        newMessages[msgIndex] = regenerateData.message;
        return newMessages;
      });
    } catch (error) {
      console.error('Error regenerating response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate response. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageOverride?: string) => {
    const messageToSend = messageOverride || inputMessage.trim();
    if (!messageToSend || loading) return;

    if (!messageOverride) {
      setInputMessage('');
    }
    setLoading(true);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: messageToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          conversationId: currentConversationId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
        const errorMessage = errorData.error || `Failed to send message (${response.status})`;

        // Create an error message to display in chat
        const errorAssistantMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'ASSISTANT',
          content: `**Error:** ${errorMessage}\n\nPlease try again or rephrasing your question.`,
          createdAt: new Date().toISOString(),
          sources: [],
        };

        // Replace temp message and add error message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
          return [...filtered, errorAssistantMessage];
        });

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update conversation ID if new
      if (data.conversation.isNew) {
        setCurrentConversationId(data.conversation.id);
        await fetchConversations();
      }

      // Replace temp message and add assistant response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        return [...filtered, ...data.messages];
      });

    } catch (error) {
      console.error('Error sending message:', error);
      // Only remove temp message if we haven't already added an error message
      setMessages((prev) => {
        const hasError = prev.some(m => m.id === tempUserMessage.id && m.role === 'ASSISTANT');
        if (hasError) {
          // Error message already added, just remove temp user message
          return prev.filter((m) => m.id !== tempUserMessage.id);
        }
        // No error message added yet, remove temp and show error
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        const errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
        return [...filtered, {
          id: `error-${Date.now()}`,
          role: 'ASSISTANT' as const,
          content: `**Error:** ${errorMessage}\n\nPlease try again or rephrasing your question.`,
          createdAt: new Date().toISOString(),
          sources: [],
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

  const handleEditMessageKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      saveEditingMessage();
    } else if (e.key === 'Escape') {
      cancelEditingMessage();
    }
  };

  const handleEditTitleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditingConversation();
    } else if (e.key === 'Escape') {
      cancelEditingConversation();
    }
  };

  const downloadDocument = (documentId: string) => {
    window.open(`/api/admin/super-documents/${documentId}/download`, '_blank');
  };

  if (authLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-xl font-semibold text-foreground">Please sign in</h3>
        <p className="mt-2 text-muted-foreground">Log in to chat with your AI financial advisor.</p>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4 md:mb-0">
          <h2 className="text-lg font-semibold md:hidden">Conversations</h2>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={createNewConversation} className="w-full" variant="default">
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {loadingConversations ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet. Start a new one!
            </div>
          ) : (
            conversations.map((conv) => (
              <Card
                key={conv.id}
                className={`p-3 cursor-pointer transition-colors ${currentConversationId === conv.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                  }`}
                onClick={() => {
                  if (editingConversationId !== conv.id) {
                    setCurrentConversationId(conv.id);
                    setSidebarOpen(false);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  {editingConversationId === conv.id ? (
                    <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        ref={editTitleRef}
                        value={editingConversationTitle}
                        onChange={(e) => setEditingConversationTitle(e.target.value)}
                        onKeyDown={handleEditTitleKeyPress}
                        className="flex-1 h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={saveEditingConversation}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={cancelEditingConversation}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.title || 'New Conversation'}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          {conv.messageCount} messages
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => startEditingConversation(conv)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteConversation(conv.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 relative">
      {/* Mobile Sidebar - Dialog */}
      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent className="max-w-[85vw] sm:max-w-md p-0 h-[85vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Conversations</DialogTitle>
          </DialogHeader>
          <SidebarContent />
        </DialogContent>
      </Dialog>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <SidebarContent />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-border bg-card flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">AI Financial Advisor</h2>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  AI Financial Advisor
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask me anything about your finances, tax planning, investments, or get
                  personalized advice based on your financial data.
                </p>
                <p className="text-xs text-muted-foreground mt-4 max-w-md">
                  You can ask about specific date ranges like &quot;last 3 months&quot; or &quot;from January to March&quot;,
                  and I&apos;ll analyze your data for that period.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[80%]">
                      {message.role === 'ASSISTANT' && (
                        <div className="flex-shrink-0 mt-1">
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        {editingMessageId === message.id && message.role === 'USER' ? (
                          <div className="bg-primary rounded-lg p-3">
                            <Textarea
                              ref={editMessageRef}
                              value={editingMessageContent}
                              onChange={(e) => setEditingMessageContent(e.target.value)}
                              onKeyDown={handleEditMessageKeyPress}
                              className="w-full bg-transparent text-primary-foreground resize-none"
                              rows={3}
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={saveEditingMessage}
                                className="text-xs"
                              >
                                Save (Ctrl+Enter)
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditingMessage}
                                className="text-xs"
                              >
                                Cancel (Esc)
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`rounded-lg p-4 relative group ${message.role === 'USER'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                              }`}
                          >
                            {message.role === 'ASSISTANT' ? (
                              <div className="break-words">
                                <MarkdownRenderer content={message.content} />
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <p className="text-xs font-semibold mb-2">Sources:</p>
                                <div className="space-y-1">
                                  {message.sources.map((source, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      {source.type === 'document' ? (
                                        <>
                                          <Download className="h-3 w-3" />
                                          <span>{source.title}</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 px-2 text-xs"
                                            onClick={() => source.id && downloadDocument(source.id)}
                                          >
                                            Download
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <ExternalLink className="h-3 w-3" />
                                          <a
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline hover:no-underline"
                                          >
                                            {source.title || source.url}
                                          </a>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Message Actions */}
                            <div className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${message.role === 'USER' ? 'text-primary-foreground' : 'text-foreground'
                              }`}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {message.role === 'USER' ? (
                                    <>
                                      <DropdownMenuItem onClick={() => startEditingMessage(message)}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => deleteMessage(message.id)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem onClick={() => regenerateResponse(message.id)}>
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      Regenerate
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )}
                      </div>
                      {message.role === 'USER' && (
                        <div className="flex-shrink-0 mt-1">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-1">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your finances..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !inputMessage.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
