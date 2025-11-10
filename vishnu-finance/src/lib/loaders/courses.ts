
import { serverFetch, ServerFetchError } from '@/lib/server-fetch';
import type { Course } from '@/types/courses';

export async function loadCourses(category?: string): Promise<Course[]> {
  const query = new URLSearchParams();
  if (category && category !== 'all') {
    query.set('category', category);
  }

  const suffix = query.toString();
  const url = `/api/courses${suffix ? `?${suffix}` : ''}`;

  try {
    const courses = await serverFetch<Course[]>(url, {
      cache: 'no-store',
      description: 'courses-bootstrap',
      revalidate: 120,
    });
    return courses ?? [];
  } catch (error) {
    if (error instanceof ServerFetchError && error.status === 404) {
      return [];
    }
    console.error('[courses] bootstrap fetch failed', error);
    return [];
  }
}
