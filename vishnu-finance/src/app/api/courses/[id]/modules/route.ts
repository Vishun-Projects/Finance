import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const modules = await prisma.module.findMany({
      where: { 
        courseId: params.id,
        isActive: true 
      },
      include: userId ? {
        progress: {
          where: { userId }
        }
      } : false,
      orderBy: { order: 'asc' }
    });

    // Calculate progress for each module if userId is provided
    const modulesWithProgress = modules.map(module => {
      const userProgress = module.progress?.[0];
      return {
        ...module,
        progress: userProgress?.progress || 0,
        isCompleted: userProgress?.isCompleted || false
      };
    });

    return NextResponse.json(modulesWithProgress);
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description, content, duration, order } = body;

    const module = await prisma.module.create({
      data: {
        courseId: params.id,
        title,
        description,
        content,
        duration,
        order
      }
    });

    return NextResponse.json(module);
  } catch (error) {
    console.error('Error creating module:', error);
    return NextResponse.json(
      { error: 'Failed to create module' },
      { status: 500 }
    );
  }
}
