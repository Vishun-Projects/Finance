import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { userId, progress, isCompleted } = body;
    const { id } = await params;

    // Update or create module progress
    const moduleProgress = await (prisma as any).moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId: id
        }
      },
      update: {
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      },
      create: {
        userId,
        moduleId: id,
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });

    // Update course progress based on module progress
    const courseModule = await (prisma as any).module.findUnique({
      where: { id },
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

    if (courseModule) {
      const totalModules = courseModule.course.modules.length;
      const completedModules = await (prisma as any).moduleProgress.count({
        where: {
          userId,
          moduleId: {
            in: courseModule.course.modules.map((m: { id: string }) => m.id)
          },
          isCompleted: true
        }
      });

      const courseProgress = (completedModules / totalModules) * 100;
      const isCourseCompleted = courseProgress >= 100;

      await (prisma as any).courseProgress.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: courseModule.courseId
          }
        },
        update: {
          progress: courseProgress,
          isCompleted: isCourseCompleted,
          completedAt: isCourseCompleted ? new Date() : null
        },
        create: {
          userId,
          courseId: courseModule.courseId,
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
