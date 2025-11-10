
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Course, CourseModule } from '@/types/courses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Loader2,
  RefreshCw,
  Target,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CoursePageClientProps {
  course: Course | null;
  courseId: string;
  fallbackCourses: Course[];
}

function computeProgress(modules: CourseModule[], progressMap: Record<string, boolean>): number {
  if (!modules.length) return 0;
  const completed = modules.filter((module) => progressMap[module.id]).length;
  return Math.round((completed / modules.length) * 100);
}

function storageKey(courseId: string) {
  return `course-progress:${courseId}`;
}

export default function CoursePageClient({ course, courseId, fallbackCourses }: CoursePageClientProps) {
  const router = useRouter();
  const [activeCourse, setActiveCourse] = useState<Course | null>(course);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!course && fallbackCourses.length) {
      const nextCourse = fallbackCourses.find((item) => item.id === courseId) ?? fallbackCourses[0] ?? null;
      setActiveCourse(nextCourse ?? null);
    } else {
      setActiveCourse(course);
    }
  }, [course, fallbackCourses, courseId]);

  useEffect(() => {
    if (!activeCourse) return;
    try {
      const stored = window.localStorage.getItem(storageKey(activeCourse.id));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setProgressMap(parsed as Record<string, boolean>);
        }
      }
    } catch (error) {
      console.warn('[course] failed to read stored progress', error);
    }
  }, [activeCourse?.id]);

  useEffect(() => {
    if (!activeCourse) return;
    try {
      window.localStorage.setItem(storageKey(activeCourse.id), JSON.stringify(progressMap));
    } catch (error) {
      console.warn('[course] failed to persist progress', error);
    }
  }, [activeCourse?.id, progressMap]);

  const currentModule = useMemo(() => {
    if (!activeCourse) return null;
    return activeCourse.modules[currentModuleIndex] ?? activeCourse.modules[0] ?? null;
  }, [activeCourse, currentModuleIndex]);

  const progressPercent = useMemo(() => {
    if (!activeCourse) return 0;
    return computeProgress(activeCourse.modules, progressMap);
  }, [activeCourse, progressMap]);

  const markModuleComplete = (moduleId: string) => {
    setProgressMap((prev) => ({ ...prev, [moduleId]: true }));
  };

  const markCourseComplete = () => {
    if (!activeCourse) return;
    const newMap = activeCourse.modules.reduce<Record<string, boolean>>((acc, module) => {
      acc[module.id] = true;
      return acc;
    }, {});
    setProgressMap(newMap);
  };

  const goToNextModule = () => {
    if (!activeCourse) return;
    setCurrentModuleIndex((index) => Math.min(index + 1, activeCourse.modules.length - 1));
  };

  const goToPreviousModule = () => {
    setCurrentModuleIndex((index) => Math.max(index - 1, 0));
  };

  const refetchCourse = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/courses');
      if (!response.ok) {
        throw new Error('Failed to refresh course content');
      }
      const data = (await response.json()) as Course[];
      const nextCourse = data.find((item) => item.id === courseId) ?? null;
      setActiveCourse(nextCourse);
    } catch (error) {
      console.error('[course] refresh failed', error);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  if (!activeCourse) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Course not found</h1>
        <p className="max-w-md text-muted-foreground">
          The course you asked for isn't available right now. Explore the education library and pick another topic to dive into.
        </p>
        <div className="flex items-center gap-2">
          <Button className="gap-2 border border-border bg-card text-foreground hover:bg-muted" onClick={() => router.push('/education')}>
            Back to courses
          </Button>
          <Button
            className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
            onClick={() => void refetchCourse()}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="border-b border-border/70 bg-card/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Button
              className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
              onClick={() => router.push('/education')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to courses
            </Button>
            <span
              className={
                'inline-flex items-center gap-2 rounded-md px-2.5 py-0.5 text-xs font-semibold '
                + (progressPercent >= 100
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-primary/10 text-primary')
              }
            >
              <Target className="h-4 w-4" />
              {progressPercent}% complete
            </span>
          </div>
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border/60 lg:h-64 lg:w-80">
              <Image
                src={activeCourse.imageUrl}
                alt={activeCourse.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 320px"
              />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <span className="capitalize">
                  {activeCourse.category.toLowerCase()}
                </span>
                <span className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4" />
                  {Math.round(activeCourse.duration / 60)} hours • {activeCourse.modules.length} modules
                </span>
                <span className="flex items-center gap-1 text-sm">
                  <Heart className="h-4 w-4" />
                  {activeCourse.rating}
                </span>
              </div>
              <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {activeCourse.title}
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                {activeCourse.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {activeCourse.level.toUpperCase()} level
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  {activeCourse.completedModules ?? 0}/{activeCourse.totalModules ?? activeCourse.modules.length} modules completed historically
                </span>
              </div>
              <div className="rounded-xl border border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Your progress</span>
                    <span className="text-2xl font-semibold text-foreground">{progressPercent}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                      onClick={markCourseComplete}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark course complete
                    </Button>
                    <Button
                      className="gap-2 border border-border bg-card text-foreground hover:bg-muted disabled:opacity-70"
                      onClick={() => void refetchCourse()}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Sync content
                    </Button>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <div className="lg:w-80">
          <Card className="sticky top-4 border-border/70">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Course modules</CardTitle>
              <p className="text-sm text-muted-foreground">Pick a module to dive into the content.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeCourse.modules.map((module, index) => {
                const isActive = index === currentModuleIndex;
                const completed = progressMap[module.id];
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setCurrentModuleIndex(index)}
                    className={cn(
                      'w-full rounded-lg border border-transparent px-4 py-3 text-left transition-colors',
                      isActive && 'border-primary bg-primary/10 text-primary',
                      !isActive && 'hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {module.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {module.duration} min
                        </span>
                      </div>
                      {completed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-6">
          {currentModule && (
            <Card className="border-border/70">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold">
                    Module {currentModuleIndex + 1}
                  </span>
                  <Clock className="h-3 w-3" />
                  {currentModule.duration} minutes
                </div>
                <CardTitle className="text-2xl font-semibold text-foreground">
                  {currentModule.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {currentModule.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm max-w-none text-foreground">
                  <p>{currentModule.content}</p>
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Keep the momentum going</p>
                    <p className="text-xs text-muted-foreground">
                      Practice what you just learned before the next module.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!progressMap[currentModule.id] && (
                        <Button
                          className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                          onClick={() => markModuleComplete(currentModule.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark complete
                        </Button>
                    )}
                    <div className="flex items-center gap-1">
                        <Button
                          className="gap-1 border border-transparent bg-card text-muted-foreground hover:text-foreground disabled:opacity-50"
                          onClick={goToPreviousModule}
                          disabled={currentModuleIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Prev
                        </Button>
                        <Button
                          className="gap-1 border border-transparent bg-card text-muted-foreground hover:text-foreground disabled:opacity-50"
                          onClick={goToNextModule}
                          disabled={currentModuleIndex >= activeCourse.modules.length - 1}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="notes">
                  <TabsList>
                    <TabsTrigger value="notes">Trainer notes</TabsTrigger>
                    <TabsTrigger value="actions">Action items</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                  </TabsList>
                  <TabsContent value="notes" className="text-sm text-muted-foreground">
                    Review the core ideas from this lesson. Repetition locks the concepts in faster.
                  </TabsContent>
                  <TabsContent value="actions" className="text-sm text-muted-foreground">
                    Pick one practical step to apply today—momentum compounds.
                  </TabsContent>
                  <TabsContent value="resources" className="text-sm text-muted-foreground">
                    Browse curated articles, podcasts, and calculators for deeper learning.
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
