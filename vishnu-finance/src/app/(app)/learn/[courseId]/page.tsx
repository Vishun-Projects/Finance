import { Suspense } from 'react';
import CoursePageClient from './page-client';
import { requireUser } from '@/lib/auth/server-auth';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { loadCourses } from '@/lib/loaders/courses';

export const dynamic = 'force-dynamic';

interface CoursePageProps {
  params: { courseId: string };
}

export default async function CourseLearningPage({ params }: CoursePageProps) {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const courses = await loadCourses();
  const course = courses.find((item) => item.id === params.courseId) ?? null;

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Loading course"
          description="Preparing your lesson plan…"
          className="min-h-[50vh]"
        />
      }
    >
      <CoursePageClient
        course={course}
        courseId={params.courseId}
        fallbackCourses={courses}
      />
    </Suspense>
  );
}
