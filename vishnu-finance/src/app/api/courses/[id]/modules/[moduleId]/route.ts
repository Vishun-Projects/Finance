import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { moduleId } = await params;

    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      include: userId ? {
        progress: {
          where: { userId }
        }
      } : false
    });

    if (!courseModule) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    const userProgress = courseModule.progress?.[0];

    return NextResponse.json({
      ...courseModule,
      progress: userProgress?.progress || 0,
      isCompleted: userProgress?.isCompleted || false
    });
  } catch (error) {
    console.error('Error fetching module:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const body = await request.json();
    const { title, description, content, duration, order } = body;
    const { moduleId } = await params;

    const courseModule = await prisma.module.update({
      where: { id: moduleId },
      data: {
        title,
        description,
        content,
        duration,
        order
      }
    });

    return NextResponse.json(courseModule);
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json(
      { error: 'Failed to update module' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    await prisma.module.update({
      where: { id: moduleId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting module:', error);
    return NextResponse.json(
      { error: 'Failed to delete module' },
      { status: 500 }
    );
  }
}
