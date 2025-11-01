import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: userId ? {
            progress: {
              where: { userId }
            }
          } : false
        },
        progress: userId ? {
          where: { userId }
        } : false
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Calculate progress for each module if userId is provided
    const modulesWithProgress = course.modules.map(module => {
      const userProgress = module.progress?.[0];
      return {
        ...module,
        progress: userProgress?.progress || 0,
        isCompleted: userProgress?.isCompleted || false
      };
    });

    const userProgress = course.progress?.[0];

    return NextResponse.json({
      ...course,
      modules: modulesWithProgress,
      progress: userProgress?.progress || 0,
      isCompleted: userProgress?.isCompleted || false
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { title, description, category, level, duration, lessons, imageUrl } = body;
    const { id } = await params;

    const course = await prisma.course.update({
      where: { id },
      data: {
        title,
        description,
        category,
        level,
        duration,
        lessons,
        imageUrl
      }
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.course.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
