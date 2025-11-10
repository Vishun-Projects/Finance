
export interface CourseModule {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: number;
  order: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: number;
  lessons: number;
  rating: number;
  imageUrl: string;
  progress?: number;
  isCompleted?: boolean;
  completedModules?: number;
  totalModules?: number;
  modules: CourseModule[];
}
