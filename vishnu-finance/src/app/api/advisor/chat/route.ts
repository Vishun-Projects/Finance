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

    // Save user message (don't block the AI request)
    const userMessagePromise = (prisma as any).advisorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message.trim(),
      },
    });

    // Start AI processing - this is the main bottleneck
    const advisorResponsePromise = processAdvisorQuery({
      userId: user.id,
      conversationId: conversation.id,
      userMessage: message.trim(),
    });

    // We only NEED the advisor response to answer the user
    // The userMessage.id is needed for the response, so we wait for that first message save.
    // However, we can generate the userMessage ID locally if needed or just wait since it's fast.
    const [userMessage, advisorResponse] = await Promise.all([
      userMessagePromise,
      advisorResponsePromise
    ]);

    // Construct the response
    const jsonResponse = {
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
          id: `temp-${Date.now()}`, // Temporary ID for immediate UI responsiveness
          role: 'ASSISTANT',
          content: advisorResponse.response,
          sources: advisorResponse.sources,
          createdAt: new Date(),
        },
      ],
    };

    // NON-BLOCKING: Save advisor's message and update conversation in the background
    (async () => {
      try {
        await (prisma as any).advisorMessage.create({
          data: {
            conversationId: conversation!.id,
            role: 'ASSISTANT',
            content: advisorResponse.response,
            sources: advisorResponse.sources as any,
          },
        });
        await (prisma as any).advisorConversation.update({
          where: { id: conversation!.id },
          data: { updatedAt: new Date() },
        });
      } catch (err) {
        console.error('Background DB save failed:', err);
      }
    })();

    // Return response IMMEDIATELY
    return NextResponse.json(jsonResponse);
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

