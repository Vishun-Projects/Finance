import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type ModuleWithProgress = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  content: string;
  duration: number;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  progress?: Array<{
    id: string;
    userId: string;
    moduleId: string;
    progress: number;
    isCompleted: boolean;
    completedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id } = await params;

    const modules = await (prisma as any).module.findMany({
      where: { 
        courseId: id,
        isActive: true 
      },
      include: userId ? {
        progress: {
          where: { userId }
        }
      } : false,
      orderBy: { order: 'asc' }
    }) as ModuleWithProgress[];

    // Calculate progress for each module if userId is provided
    const modulesWithProgress = modules.map((courseModule: ModuleWithProgress) => {
      const userProgress = courseModule.progress?.[0];
      return {
        ...courseModule,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { title, description, content, duration, order } = body;
    const { id } = await params;

    const courseModule = await (prisma as any).module.create({
      data: {
        courseId: id,
        title,
        description,
        content,
        duration,
        order
      }
    });

    return NextResponse.json(courseModule);
  } catch (error) {
    console.error('Error creating module:', error);
    return NextResponse.json(
      { error: 'Failed to create module' },
      { status: 500 }
    );
  }
}
