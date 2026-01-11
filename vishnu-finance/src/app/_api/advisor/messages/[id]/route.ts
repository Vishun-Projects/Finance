import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const message = await prisma.advisorMessage.findUnique({
      where: { id },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only allow editing user messages
    if (message.role !== 'USER') {
      return NextResponse.json({ error: 'Only user messages can be edited' }, { status: 400 });
    }

    const updated = await prisma.advisorMessage.update({
      where: { id },
      data: { content: content.trim() },
    });

    // Update conversation timestamp
    await prisma.advisorConversation.update({
      where: { id: message.conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: updated.id,
        role: updated.role,
        content: updated.content,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const message = await prisma.advisorMessage.findUnique({
      where: { id },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.advisorMessage.delete({
      where: { id },
    });

    // Update conversation timestamp
    await prisma.advisorConversation.update({
      where: { id: message.conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 },
    );
  }
}

