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

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.advisorConversation.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title || 'New Conversation',
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv._count.messages,
      })),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = body.title || null;

    const conversation = await prisma.advisorConversation.create({
      data: {
        userId: user.id,
        title,
      },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title || 'New Conversation',
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 },
    );
  }
}

