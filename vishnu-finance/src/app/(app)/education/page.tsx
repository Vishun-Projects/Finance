
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  PiggyBank,
  Play,
  Shield,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import PageSkeleton from '@/components/feedback/page-skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Course {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  lessons: number;
  completed: boolean;
  progress: number;
  rating: number;
}

const FALLBACK_COURSES: Course[] = [
  {
    id: 'default-1',
    title: 'Personal Finance Fundamentals for Indians',
    description: 'Master the basics of personal finance tailored for the Indian market, including banking, insurance, and tax-saving instruments.',
    duration: 120,
    level: 'beginner',
    category: 'basics',
    lessons: 8,
    completed: false,
    progress: 0,
    rating: 4.8,
  },
  {
    id: 'default-2',
    title: 'Understanding Indian Stock Market',
    description: 'Complete guide to investing in Indian stock markets - NSE, BSE, and key concepts for beginners.',
    duration: 180,
    level: 'beginner',
    category: 'investing',
    lessons: 10,
    completed: false,
    progress: 0,
    rating: 4.7,
  },
  {
    id: 'default-3',
    title: 'Mutual Funds for Indian Investors',
    description: 'Complete guide to mutual fund investing in India - types, selection, and portfolio building.',
    duration: 150,
    level: 'intermediate',
    category: 'investing',
    lessons: 8,
    completed: false,
    progress: 0,
    rating: 4.9,
  },
  {
    id: 'default-4',
    title: 'Real Estate Investment in India',
    description: 'Complete guide to real estate investment in India - residential, commercial, and REITs.',
    duration: 120,
    level: 'intermediate',
    category: 'investing',
    lessons: 6,
    completed: false,
    progress: 0,
    rating: 4.6,
  },
  {
    id: 'default-5',
    title: 'Gold Investment Strategies',
    description: 'Traditional and modern ways to invest in gold in India - physical, digital, and ETFs.',
    duration: 90,
    level: 'beginner',
    category: 'investing',
    lessons: 5,
    completed: false,
    progress: 0,
    rating: 4.5,
  },
  {
    id: 'default-6',
    title: 'Debt Management for Indians',
    description: 'Managing various types of debt in India - credit cards, personal loans, home loans, and debt consolidation.',
    duration: 120,
    level: 'beginner',
    category: 'debt',
    lessons: 7,
    completed: false,
    progress: 0,
    rating: 4.7,
  },
  {
    id: 'default-7',
    title: 'Retirement Planning in India',
    description: 'Comprehensive retirement planning for Indians - NPS, EPF, and other retirement instruments.',
    duration: 150,
    level: 'intermediate',
    category: 'retirement',
    lessons: 8,
    completed: false,
    progress: 0,
    rating: 4.8,
  },
  {
    id: 'default-8',
    title: 'Tax Planning and Filing',
    description: 'Complete guide to Indian tax system - ITR filing, deductions, and tax-saving strategies.',
    duration: 180,
    level: 'intermediate',
    category: 'taxes',
    lessons: 10,
    completed: false,
    progress: 0,
    rating: 4.6,
  },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  basics: PiggyBank,
  investing: TrendingUp,
  debt: Shield,
  planning: Target,
  taxes: Shield,
  retirement: Users,
};

function formatDuration(minutes: number): string {
  if (!minutes) return '—';
  if (minutes < 90) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  return `${Math.round(hours * 10) / 10} hours`;
}

export default function EducationPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [courses, setCourses] = useState<Course[]>(FALLBACK_COURSES);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!user || authLoading) return;

    const fetchCourses = async () => {
      setIsFetching(true);
      try {
        const response = await fetch('/api/courses');
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        const data = (await response.json()) as Course[];
        setCourses(
          data.map((course) => ({
            ...course,
            duration: typeof course.duration === 'number' ? course.duration : Number(course.duration) || 0,
          }))
        );
      } catch (error) {
        console.error('[education] failed to load courses', error);
        setCourses(FALLBACK_COURSES);
      } finally {
        setIsFetching(false);
      }
    };

    void fetchCourses();
  }, [user, authLoading]);

  const categoryStats = useMemo(() => {
    const summary: Record<string, number> = {};
    courses.forEach((course) => {
      summary[course.category] = (summary[course.category] ?? 0) + 1;
    });

    const categories = [
      { id: 'all', name: 'All Courses', count: courses.length },
      ...Object.entries(summary).map(([id, count]) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        count,
      })),
    ];

    return categories;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (selectedCategory === 'all') {
      return courses;
    }
    return courses.filter((course) => course.category === selectedCategory);
  }, [courses, selectedCategory]);

  const completedCourses = courses.filter((course) => course.completed).length;
  const totalProgress = courses.length
    ? Math.round((courses.reduce((sum, course) => sum + (course.progress ?? 0), 0) / courses.length) * 10) / 10
    : 0;

  if (authLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-xl font-semibold text-foreground">Please sign in</h3>
        <p className="mt-2 text-muted-foreground">Log in to explore personalised learning recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Financial Education</h1>
          <p className="text-muted-foreground">Learn and master personal finance concepts with curated micro-courses.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            {completedCourses} completed
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Avg progress {totalProgress}%
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categoryStats.map((category) => {
          const Icon = CATEGORY_ICONS[category.id] ?? BookOpen;
          const selected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={
                'flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:border-primary hover:bg-primary/5'
                + (selected ? ' border-primary bg-primary/10' : '')
              }
            >
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">{category.count} course{category.count === 1 ? '' : 's'}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filteredCourses.map((course) => {
          const Icon = CATEGORY_ICONS[course.category] ?? BookOpen;
          const isComplete = course.completed || course.progress >= 100;

          return (
            <Card key={course.id} className="flex h-full flex-col border-border/70">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg text-foreground">{course.title}</CardTitle>
                      <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
                        {course.level}
                      </CardDescription>
                    </div>
                  </div>
                  <span
                    className={
                      'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold '
                      + (isComplete
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-primary/10 text-primary')
                    }
                  >
                    {isComplete ? 'Completed' : 'In progress'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>{course.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(course.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {course.lessons} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500" />
                      {course.rating}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/learn/${course.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4" />
                    {isComplete ? 'Review course' : course.progress > 0 ? 'Continue learning' : 'Start course'}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Target className="h-3 w-3" />
                    {isComplete ? 'Great job! Keep practising.' : 'Block 20 minutes today to stay on track.'}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!filteredCourses.length && (
          <Card className="border-dashed border-border/70">
            <CardContent className="py-12 text-center text-muted-foreground">
              {isFetching
                ? 'Loading courses…'
                : 'No courses in this category yet. Try another filter.'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
