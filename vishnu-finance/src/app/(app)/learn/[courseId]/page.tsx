'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Clock, 
  Star, 
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Award,
  Target
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

interface Module {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: number;
  order: number;
  isCompleted?: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: number;
  lessons: number;
  rating: number;
  imageUrl: string;
  progress: number;
  isCompleted: boolean;
  completedModules: number;
  totalModules: number;
  modules: Module[];
}

export default function CourseLearningPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moduleProgress, setModuleProgress] = useState<Record<string, boolean>>({});

  const courseId = params.courseId as string;

  useEffect(() => {
    if (user && !authLoading) {
      loadCourse();
    }
  }, [user, authLoading, courseId]);

  const loadCourse = async () => {
    try {
      const response = await fetch('/api/courses');
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const courses = await response.json();
      const foundCourse = courses.find((c: Course) => c.id === courseId);
      
      if (foundCourse) {
        setCourse(foundCourse);
        // Initialize module progress from localStorage
        const savedProgress = localStorage.getItem(`course-${courseId}-progress`);
        if (savedProgress) {
          setModuleProgress(JSON.parse(savedProgress));
        }
      } else {
        router.push('/education');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      router.push('/education');
    } finally {
      setLoading(false);
    }
  };

  const markModuleComplete = (moduleId: string) => {
    const newProgress = { ...moduleProgress, [moduleId]: true };
    setModuleProgress(newProgress);
    localStorage.setItem(`course-${courseId}-progress`, JSON.stringify(newProgress));
  };

  const nextModule = () => {
    if (course && currentModuleIndex < course.modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    }
  };

  const prevModule = () => {
    if (currentModuleIndex > 0) {
      setCurrentModuleIndex(currentModuleIndex - 1);
    }
  };

  const getCourseProgress = () => {
    if (!course) return 0;
    const completedCount = Object.values(moduleProgress).filter(Boolean).length;
    return Math.round((completedCount / course.modules.length) * 100);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Please Login</h3>
        <p className="text-gray-600 mb-8">You need to be logged in to access courses</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Course Not Found</h3>
                        <p className="text-gray-600 mb-8">The course you&apos;re looking for doesn&apos;t exist</p>
        <button
          onClick={() => router.push('/education')}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  const currentModule = course.modules[currentModuleIndex];
  const progress = getCourseProgress();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/education')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Courses</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Progress: {progress}%
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Course Modules */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="mb-6">
              <img 
                src={course.imageUrl} 
                alt={course.title}
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h1>
              <p className="text-sm text-gray-600 mb-4">{course.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{Math.round(course.duration / 60)} hours</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.modules.length} modules</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>{course.rating}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Course Modules</h3>
              {course.modules.map((module, index) => (
                <div
                  key={module.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    index === currentModuleIndex
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentModuleIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        moduleProgress[module.id]
                          ? 'bg-green-100 text-green-600'
                          : index === currentModuleIndex
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {moduleProgress[module.id] ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{module.title}</h4>
                        <p className="text-xs text-gray-600">{module.duration} min</p>
                      </div>
                    </div>
                    {moduleProgress[module.id] && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {currentModule && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        {currentModule.title}
                      </h2>
                      <p className="text-gray-600">{currentModule.description}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{currentModule.duration} minutes</span>
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none mb-8">
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Learning Content</h3>
                    <p className="text-gray-700 leading-relaxed">{currentModule.content}</p>
                  </div>

                  {/* Enhanced content based on module */}
                  <div className="space-y-6">
                    {currentModule.id === 'mod-1' && (
                      <div className="bg-blue-50 rounded-lg p-6">
                        <h4 className="font-semibold text-blue-900 mb-3">Key Learning Points:</h4>
                        <ul className="space-y-2 text-blue-800">
                          <li>• India has over 1.4 billion people with diverse financial needs</li>
                          <li>• Understanding cultural aspects of money management is crucial</li>
                          <li>• Government schemes provide additional financial security</li>
                          <li>• Banking system has evolved significantly with digital payments</li>
                        </ul>
                      </div>
                    )}

                    {currentModule.id === 'mod-2' && (
                      <div className="bg-green-50 rounded-lg p-6">
                        <h4 className="font-semibold text-green-900 mb-3">UPI Revolution:</h4>
                        <ul className="space-y-2 text-green-800">
                          <li>• India processes more UPI transactions than the rest of the world combined</li>
                          <li>• Digital wallets and payment apps have transformed banking</li>
                          <li>• Security measures are continuously evolving</li>
                          <li>• Traditional banking still plays a crucial role</li>
                        </ul>
                      </div>
                    )}

                    {currentModule.id === 'mod-4' && (
                      <div className="bg-purple-50 rounded-lg p-6">
                        <h4 className="font-semibold text-purple-900 mb-3">Stock Market Facts:</h4>
                        <ul className="space-y-2 text-purple-800">
                          <li>• BSE is Asia&apos;s oldest stock exchange, established in 1875</li>
                          <li>• NSE and BSE are the two major exchanges in India</li>
                          <li>• Market timings: 9:15 AM to 3:30 PM (Monday to Friday)</li>
                          <li>• Key indices: Nifty 50, Sensex, Bank Nifty</li>
                        </ul>
                      </div>
                    )}

                    {currentModule.id === 'mod-7' && (
                      <div className="bg-orange-50 rounded-lg p-6">
                        <h4 className="font-semibold text-orange-900 mb-3">Mutual Fund Growth:</h4>
                        <ul className="space-y-2 text-orange-800">
                          <li>• Industry grew from ₹8.25 lakh crore in 2014 to over ₹50 lakh crore in 2024</li>
                          <li>• SIP (Systematic Investment Plan) is India&apos;s favorite investment method</li>
                          <li>• SEBI regulations ensure investor protection</li>
                          <li>• Different types suit different risk appetites</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    onClick={prevModule}
                    disabled={currentModuleIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center space-x-4">
                    {!moduleProgress[currentModule.id] && (
                      <button
                        onClick={() => markModuleComplete(currentModule.id)}
                        className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark Complete</span>
                      </button>
                    )}

                    {currentModuleIndex < course.modules.length - 1 ? (
                      <button
                        onClick={nextModule}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <span>Next Module</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          markModuleComplete(currentModule.id);
                          alert('Congratulations! You have completed this course!');
                        }}
                        className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Award className="w-4 h-4" />
                        <span>Complete Course</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
