import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await AuthService.getUserFromToken(token.value);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        const posts = await prisma.educationPost.findMany({
            where: {
                published: true,
                ...(category ? { category } : {}),
                ...(search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { excerpt: { contains: search, mode: 'insensitive' } }
                    ]
                } : {}),
            },
            include: {
                author: {
                    select: { name: true }
                },
                _count: {
                    select: { progress: { where: { userId: user.id, isCompleted: true } } }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const transformedPosts = posts.map(post => ({
            ...post,
            isCompleted: post._count.progress > 0
        }));

        return NextResponse.json(transformedPosts);
    } catch (error) {
        console.error('Failed to fetch posts:', error);
        return NextResponse.json([]);
    }
}
