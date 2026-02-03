import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const token = request.cookies.get('auth-token');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await AuthService.getUserFromToken(token.value);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const post = await prisma.educationPost.findFirst({
            where: {
                slug: { equals: slug, mode: 'insensitive' },
                published: true
            },
            include: {
                author: { select: { name: true, bio: true, avatarUrl: true } },
                progress: { where: { userId: user.id } }
            }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...post,
            isCompleted: post.progress.some((p: any) => p.isCompleted)
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }
}
