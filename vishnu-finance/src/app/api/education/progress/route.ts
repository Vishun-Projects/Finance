import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await AuthService.getUserFromToken(token.value);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { postId, isCompleted } = await request.json();

        if (!postId) {
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        const progress = await prisma.educationProgress.upsert({
            where: {
                userId_postId: {
                    userId: user.id,
                    postId
                }
            },
            update: { isCompleted: !!isCompleted },
            create: {
                userId: user.id,
                postId,
                isCompleted: !!isCompleted
            }
        });

        return NextResponse.json(progress);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }
}
