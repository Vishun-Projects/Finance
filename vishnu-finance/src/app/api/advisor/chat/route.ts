import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { processAdvisorQuery, type AdvisorResponse } from '@/lib/advisor-service';
import { GeminiQuotaExceededError } from '@/lib/gemini-quota';
import { getGeminiQuotaStatus } from '@/lib/gemini';
import { GroqRateLimitError } from '@/lib/groq';
import {
  checkAdvisorUserRateLimit,
  advisorRateLimitResponse,
} from '@/lib/advisor-rate-limit';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function errorToJson(error: unknown): { body: Record<string, unknown>; status: number } {
  if (error instanceof GeminiQuotaExceededError) {
    return {
      status: 429,
      body: {
        error: error.status.message,
        code: 'GEMINI_QUOTA',
        quota: error.status,
        retryAfterSec: error.status.retryAfterSeconds,
      },
    };
  }
  if (error instanceof GroqRateLimitError) {
    return {
      status: 429,
      body: {
        error: error.status.message,
        code: 'GROQ_RATE_LIMIT',
        groq: error.status,
        retryAfterSec: error.status.retryAfterSeconds,
      },
    };
  }
  const errorMessage = error instanceof Error ? error.message : 'Failed to process message';
  if (/quota|rate limit|429|too many requests/i.test(errorMessage)) {
    const quota = getGeminiQuotaStatus();
    return {
      status: 429,
      body: {
        error: quota.message || errorMessage,
        code: 'GEMINI_QUOTA',
        quota,
        retryAfterSec: quota.retryAfterSeconds,
      },
    };
  }
  let detailedError = errorMessage;
  if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
    detailedError = `The AI service is currently overloaded. Please try again in a few moments.\n\nError details: ${errorMessage}`;
  } else if (errorMessage.includes('API_KEY') || errorMessage.includes('authentication')) {
    detailedError = `Authentication error with AI service. Please contact support.\n\nError details: ${errorMessage}`;
  } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    detailedError = `Request timed out. The AI service may be slow. Please try again.\n\nError details: ${errorMessage}`;
  }
  return { status: 500, body: { error: detailedError } };
}

function buildAssistantPayload(
  advisorResponse: AdvisorResponse,
  conversation: { id: string; title: string },
  isNewConversation: boolean,
  userMessage: { id: string; content: string; createdAt: Date },
) {
  return {
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
        id: `temp-${Date.now()}`,
        role: 'ASSISTANT',
        content: advisorResponse.response,
        sources: advisorResponse.sources,
        createdAt: new Date(),
        requestedFormat: advisorResponse.requestedFormat,
        attachment: advisorResponse.attachment,
        chartConfig: advisorResponse.chartConfig,
        artifacts: advisorResponse.artifacts,
        provider: advisorResponse.provider,
        providerNotice: advisorResponse.providerNotice,
        groqRateLimit: advisorResponse.groqRateLimit,
        followUps: advisorResponse.followUps,
        turnStatus: advisorResponse.turnStatus,
      },
    ],
  };
}

function persistAssistantInBackground(
  conversationId: string,
  advisorResponse: AdvisorResponse,
) {
  void (async () => {
    try {
      await (prisma as any).advisorMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: advisorResponse.response,
          sources: [
            ...(Array.isArray(advisorResponse.sources) ? advisorResponse.sources : []),
          ] as any,
        },
      });
      await (prisma as any).advisorConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      console.error('Background DB save failed:', err);
    }
  })();
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = checkAdvisorUserRateLimit(user.id);
    if (!rate.allowed) {
      return advisorRateLimitResponse(rate);
    }

    const body = await request.json();
    const message = body.message || '';
    const conversationId = body.conversationId || null;
    const wantStream =
      body.stream !== false &&
      process.env.ADVISOR_STREAMING !== '0' &&
      (body.stream === true ||
        request.headers.get('accept')?.includes('text/event-stream'));

    if (!message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let conversation;
    let isNewConversation = false;

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
      const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
      conversation = await (prisma as any).advisorConversation.create({
        data: {
          userId: user.id,
          title,
        },
      });
      isNewConversation = true;
    }

    const userMessagePromise = (prisma as any).advisorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message.trim(),
      },
    });

    if (!wantStream) {
      const [userMessage, advisorResponse] = await Promise.all([
        userMessagePromise,
        processAdvisorQuery({
          userId: user.id,
          conversationId: conversation.id,
          userMessage: message.trim(),
        }),
      ]);

      const jsonResponse = buildAssistantPayload(
        advisorResponse,
        conversation,
        isNewConversation,
        userMessage,
      );
      persistAssistantInBackground(conversation.id, advisorResponse);
      return NextResponse.json(jsonResponse);
    }

    // SSE streaming path
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        };

        try {
          const userMessage = await userMessagePromise;
          send('meta', {
            conversationId: conversation.id,
            conversationTitle: conversation.title,
            isNew: isNewConversation,
            userMessageId: userMessage.id,
          });

          const advisorResponse = await processAdvisorQuery({
            userId: user.id,
            conversationId: conversation.id,
            userMessage: message.trim(),
            onToken: (delta) => send('token', { text: delta }),
            onEvent: (ev) => send(ev.type, ev.data),
          });

          const payload = buildAssistantPayload(
            advisorResponse,
            conversation,
            isNewConversation,
            userMessage,
          );
          send('done', payload);
          persistAssistantInBackground(conversation.id, advisorResponse);
          controller.close();
        } catch (error) {
          console.error('Error processing streamed chat:', error);
          const { body: errBody } = errorToJson(error);
          send('error', errBody);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    const { body, status } = errorToJson(error);
    return NextResponse.json(body, { status });
  }
}
