import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { addImageGenerationJob } from '@/lib/services/image-queue';
import { ImageJobType } from '@prisma/client';

async function requireSuperuser(request: NextRequest) {
    const token = request.cookies.get('auth-token');
    if (!token) return null;
    const user = await AuthService.getUserFromToken(token.value);
    if (!user || user.role !== 'SUPERUSER' || !user.isActive) return null;
    return user;
}

export async function GET(request: NextRequest) {
    try {
        const superuser = await requireSuperuser(request);
        if (!superuser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const posts = await prisma.educationPost.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        return NextResponse.json(posts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const superuser = await requireSuperuser(request);
        if (!superuser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, slug, content, excerpt, category, difficulty, readTime, published, coverImage, imagePrompt } = body;

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        const post = await prisma.educationPost.create({
            data: {
                title,
                slug: slug || title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
                content,
                excerpt,
                category: category || 'General',
                difficulty: difficulty || 'Beginner',
                readTime: readTime || 5,
                published: !!published,
                coverImage,
                imagePrompt,
                authorId: superuser.id,
            }
        });

        if (imagePrompt) {
            const { addImageGenerationJob, triggerImmediateProcessing } = await import('@/lib/services/image-queue');
            const { ImageJobType } = await import('@prisma/client');

            await addImageGenerationJob(
                post.id,
                ImageJobType.EDUCATION_POST,
                imagePrompt
            );

            // Trigger background processing immediately
            triggerImmediateProcessing();
        }

        return NextResponse.json(post, { status: 201 });
    } catch (error) {
        console.error('Failed to create post:', error);
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const superuser = await requireSuperuser(request);
        if (!superuser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, title, slug, content, excerpt, category, difficulty, readTime, published, coverImage, imagePrompt, regenerateImage } = body;

        if (!id) {
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        const post = await prisma.educationPost.update({
            where: { id },
            data: {
                title,
                slug,
                content,
                excerpt,
                category,
                difficulty,
                readTime,
                published,
                coverImage,
                imagePrompt,
            }
        });

        // Trigger Image Generation Queue if prompt exists and user requested regeneration
        if (imagePrompt && regenerateImage) {
            const { addImageGenerationJob, triggerImmediateProcessing } = await import('@/lib/services/image-queue');
            const { ImageJobType } = await import('@prisma/client');

            await addImageGenerationJob(
                post.id,
                ImageJobType.EDUCATION_POST,
                imagePrompt
            );

            // Trigger background processing immediately
            triggerImmediateProcessing();
        }

        return NextResponse.json(post);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const superuser = await requireSuperuser(request);
        if (!superuser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        await prisma.educationPost.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }
}
