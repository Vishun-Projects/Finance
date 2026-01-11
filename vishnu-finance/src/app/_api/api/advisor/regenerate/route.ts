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

/**
 * Regenerate AI response for a specific user message
 * This endpoint regenerates the assistant's response without creating a new user message
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, userMessageId } = body;

    if (!conversationId || !userMessageId) {
      return NextResponse.json(
        { error: 'Conversation ID and user message ID are required' },
        { status: 400 }
      );
    }

    // Verify conversation belongs to user
    const conversation = await prisma.advisorConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the user message
    const userMessage = await prisma.advisorMessage.findUnique({
      where: { id: userMessageId },
    });

    if (!userMessage || userMessage.role !== 'USER' || userMessage.conversationId !== conversationId) {
      return NextResponse.json({ error: 'User message not found' }, { status: 404 });
    }

    // Delete existing assistant response if it exists (the one immediately after this user message)
    const allMessages = await prisma.advisorMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const userMsgIndex = allMessages.findIndex((m) => m.id === userMessageId);
    if (userMsgIndex !== -1 && userMsgIndex + 1 < allMessages.length) {
      const nextMessage = allMessages[userMsgIndex + 1];
      if (nextMessage.role === 'ASSISTANT') {
        await prisma.advisorMessage.delete({
          where: { id: nextMessage.id },
        });
      }
    }

    // Process query and get AI response
    const advisorResponse = await processAdvisorQuery({
      userId: user.id,
      conversationId: conversation.id,
      userMessage: userMessage.content,
    });

    // Save assistant message
    const assistantMessage = await prisma.advisorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: advisorResponse.response,
        sources: JSON.stringify(advisorResponse.sources),
      },
    });

    // Update conversation timestamp
    await prisma.advisorConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: assistantMessage.id,
        role: 'ASSISTANT',
        content: assistantMessage.content,
        sources: advisorResponse.sources,
        createdAt: assistantMessage.createdAt,
      },
    });
  } catch (error) {
    console.error('Error regenerating response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate response';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}

