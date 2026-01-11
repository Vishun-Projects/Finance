import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { processAdvisorQuery } from '@/lib/advisor-service';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle JSON requests only
    const body = await request.json();
    const message = body.message || '';
    const conversationId = body.conversationId || null;

    if (!message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let conversation;
    let isNewConversation = false;

    // Get or create conversation
    if (conversationId) {
      conversation = await (prisma as any).advisorConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      if (conversation.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else {
      // Create new conversation
      // Generate title from first message (truncated)
      const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
      conversation = await (prisma as any).advisorConversation.create({
        data: {
          userId: user.id,
          title,
        },
      });
      isNewConversation = true;
    }

    // Save user message
    const userMessage = await (prisma as any).advisorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message.trim(),
      },
    });

    // Process query and get AI response
    let advisorResponse;
    try {
      advisorResponse = await processAdvisorQuery({
        userId: user.id,
        conversationId: conversation.id,
        userMessage: message.trim(),
      });
    } catch (error) {
      console.error('Error processing advisor query:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Save error message as assistant response so user can see what went wrong
      const errorResponse = `**Error:** ${errorMessage}\n\nThis could be due to:\n- API service temporarily unavailable\n- Model overload (please try again in a few moments)\n- Invalid query format\n- Missing required data\n\nPlease try rephrasing your question or try again later.`;
      
      const assistantMessage = await (prisma as any).advisorMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: errorResponse,
          sources: JSON.stringify([]),
        },
      });

      // Update conversation timestamp
      await (prisma as any).advisorConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({
        conversation: {
          id: conversation.id,
          title: conversation.title,
          isNew: isNewConversation,
        },
        messages: [
          {
            id: userMessage.id,
            role: 'USER',
            content: userMessage.content,
            createdAt: userMessage.createdAt,
          },
          {
            id: assistantMessage.id,
            role: 'ASSISTANT',
            content: assistantMessage.content,
            sources: [],
            createdAt: assistantMessage.createdAt,
          },
        ],
      });
    }

    // Validate that we got a response
    if (!advisorResponse || !advisorResponse.response || advisorResponse.response.trim().length === 0) {
      const errorMessage = 'The AI model did not generate a response. This could be due to:\n- Model overload (please try again in a few moments)\n- Empty response from the AI service\n- Timeout or connection issue\n\nPlease try rephrasing your question or try again later.';
      
      const assistantMessage = await (prisma as any).advisorMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: `**Error:** ${errorMessage}`,
          sources: JSON.stringify([]),
        },
      });

      // Update conversation timestamp
      await (prisma as any).advisorConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({
        conversation: {
          id: conversation.id,
          title: conversation.title,
          isNew: isNewConversation,
        },
        messages: [
          {
            id: userMessage.id,
            role: 'USER',
            content: userMessage.content,
            createdAt: userMessage.createdAt,
          },
          {
            id: assistantMessage.id,
            role: 'ASSISTANT',
            content: assistantMessage.content,
            sources: [],
            createdAt: assistantMessage.createdAt,
          },
        ],
      });
    }

    // Save assistant message
    const assistantMessage = await (prisma as any).advisorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: advisorResponse.response,
        sources: JSON.stringify(advisorResponse.sources),
      },
    });

    // Update conversation timestamp
    await (prisma as any).advisorConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        isNew: isNewConversation,
      },
      messages: [
        {
          id: userMessage.id,
          role: 'USER',
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        {
          id: assistantMessage.id,
          role: 'ASSISTANT',
          content: assistantMessage.content,
          sources: advisorResponse.sources,
          createdAt: assistantMessage.createdAt,
        },
      ],
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process message';
    
    // Try to provide more detailed error information
    let detailedError = errorMessage;
    if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      detailedError = `The AI service is currently overloaded. Please try again in a few moments.\n\nError details: ${errorMessage}`;
    } else if (errorMessage.includes('API_KEY') || errorMessage.includes('authentication')) {
      detailedError = `Authentication error with AI service. Please contact support.\n\nError details: ${errorMessage}`;
    } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      detailedError = `API rate limit exceeded. Please try again later.\n\nError details: ${errorMessage}`;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      detailedError = `Request timed out. The AI service may be slow. Please try again.\n\nError details: ${errorMessage}`;
    }
    
    return NextResponse.json(
      { 
        error: detailedError,
        details: error instanceof Error ? {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        } : undefined,
      },
      { status: 500 },
    );
  }
}

