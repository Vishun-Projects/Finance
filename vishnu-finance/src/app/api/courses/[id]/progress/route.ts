import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, progress, isCompleted } = body;

    // Update or create course progress
    const courseProgress = await prisma.courseProgress.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId: params.id
        }
      },
      update: {
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      },
      create: {
        userId,
        courseId: params.id,
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });

    return NextResponse.json(courseProgress);
  } catch (error) {
    console.error('Error updating course progress:', error);
    return NextResponse.json(
      { error: 'Failed to update course progress' },
      { status: 500 }
    );
  }
}
