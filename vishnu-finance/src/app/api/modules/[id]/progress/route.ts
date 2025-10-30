import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, progress, isCompleted } = body;

    // Update or create module progress
    const moduleProgress = await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId: params.id
        }
      },
      update: {
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      },
      create: {
        userId,
        moduleId: params.id,
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });

    // Update course progress based on module progress
    const module = await prisma.module.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            modules: {
              where: { isActive: true },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (module) {
      const totalModules = module.course.modules.length;
      const completedModules = await prisma.moduleProgress.count({
        where: {
          userId,
          moduleId: {
            in: module.course.modules.map(m => m.id)
          },
          isCompleted: true
        }
      });

      const courseProgress = (completedModules / totalModules) * 100;
      const isCourseCompleted = courseProgress >= 100;

      await prisma.courseProgress.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: module.courseId
          }
        },
        update: {
          progress: courseProgress,
          isCompleted: isCourseCompleted,
          completedAt: isCourseCompleted ? new Date() : null
        },
        create: {
          userId,
          courseId: module.courseId,
          progress: courseProgress,
          isCompleted: isCourseCompleted,
          completedAt: isCourseCompleted ? new Date() : null
        }
      });
    }

    return NextResponse.json(moduleProgress);
  } catch (error) {
    console.error('Error updating module progress:', error);
    return NextResponse.json(
      { error: 'Failed to update module progress' },
      { status: 500 }
    );
  }
}
