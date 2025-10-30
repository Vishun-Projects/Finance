'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  Clock, 
  Star,
  TrendingUp,
  PiggyBank,
  Shield,
  Target,
  Users,
  Award,
  ArrowRight
} from 'lucide-react';
import PageSkeleton from '../../../components/PageSkeleton';

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  lessons: number;
  completed: boolean;
  progress: number;
  rating: number;
  icon: any;
}

export default function EducationPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    category: 'basics',
    level: 'beginner',
    duration: '',
    lessons: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (user && !authLoading) {
      loadCourses();
    }
  }, [user, authLoading]);

  const loadCourses = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/courses?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const data = await response.json();
      
      // Map API data to component format
      const mappedCourses: Course[] = data.map((course: any) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        duration: `${Math.round(course.duration / 60)} hours`,
        level: course.level,
        category: course.category,
        lessons: course.lessons,
        completed: course.isCompleted,
        progress: course.progress,
        rating: course.rating,
        icon: getIconForCategory(course.category)
      }));
      
      setCourses(mappedCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      // Fallback to default courses
      const defaultCourses: Course[] = [
        {
          id: 'default-1',
          title: "Personal Finance Fundamentals for Indians",
          description: "Master the basics of personal finance tailored for the Indian market, including banking, insurance, and tax-saving instruments.",
          duration: "2 hours",
          level: "beginner",
          category: "basics",
          lessons: 8,
          completed: false,
          progress: 0,
          rating: 4.8,
          icon: PiggyBank
        },
        {
          id: 'default-2',
          title: "Understanding Indian Stock Market",
          description: "Complete guide to investing in Indian stock markets - NSE, BSE, and key concepts for beginners.",
          duration: "3 hours",
          level: "beginner",
          category: "investing",
          lessons: 10,
          completed: false,
          progress: 0,
          rating: 4.7,
          icon: TrendingUp
        },
        {
          id: 'default-3',
          title: "Mutual Funds for Indian Investors",
          description: "Complete guide to mutual fund investing in India - types, selection, and portfolio building.",
          duration: "2.5 hours",
          level: "intermediate",
          category: "investing",
          lessons: 8,
          completed: false,
          progress: 0,
          rating: 4.9,
          icon: TrendingUp
        },
        {
          id: 'default-4',
          title: "Real Estate Investment in India",
          description: "Complete guide to real estate investment in India - residential, commercial, and REITs.",
          duration: "2 hours",
          level: "intermediate",
          category: "investing",
          lessons: 6,
          completed: false,
          progress: 0,
          rating: 4.6,
          icon: TrendingUp
        },
        {
          id: 'default-5',
          title: "Gold Investment Strategies",
          description: "Traditional and modern ways to invest in gold in India - physical, digital, and ETFs.",
          duration: "1.5 hours",
          level: "beginner",
          category: "investing",
          lessons: 5,
          completed: false,
          progress: 0,
          rating: 4.5,
          icon: TrendingUp
        },
        {
          id: 'default-6',
          title: "Debt Management for Indians",
          description: "Managing various types of debt in India - credit cards, personal loans, home loans, and debt consolidation.",
          duration: "2 hours",
          level: "beginner",
          category: "debt",
          lessons: 7,
          completed: false,
          progress: 0,
          rating: 4.7,
          icon: Shield
        },
        {
          id: 'default-7',
          title: "Retirement Planning in India",
          description: "Comprehensive retirement planning for Indians - NPS, EPF, and other retirement instruments.",
          duration: "2.5 hours",
          level: "intermediate",
          category: "retirement",
          lessons: 8,
          completed: false,
          progress: 0,
          rating: 4.8,
          icon: Target
        },
        {
          id: 'default-8',
          title: "Tax Planning and Filing",
          description: "Complete guide to Indian tax system - ITR filing, deductions, and tax-saving strategies.",
          duration: "3 hours",
          level: "intermediate",
          category: "taxes",
          lessons: 10,
          completed: false,
          progress: 0,
          rating: 4.6,
          icon: Shield
        }
      ];
      setCourses(defaultCourses);
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'basics': return PiggyBank;
      case 'investing': return TrendingUp;
      case 'debt': return Shield;
      case 'planning': return Target;
      case 'taxes': return Shield;
      case 'retirement': return Users;
      default: return BookOpen;
    }
  };

  const categories = [
    { id: 'all', name: 'All Courses', count: courses.length },
    { id: 'basics', name: 'Basics', count: courses.filter(c => c.category === 'basics').length },
    { id: 'investing', name: 'Investing', count: courses.filter(c => c.category === 'investing').length },
    { id: 'debt', name: 'Debt Management', count: courses.filter(c => c.category === 'debt').length },
    { id: 'planning', name: 'Planning', count: courses.filter(c => c.category === 'planning').length },
    { id: 'taxes', name: 'Taxes', count: courses.filter(c => c.category === 'taxes').length },
    { id: 'retirement', name: 'Retirement', count: courses.filter(c => c.category === 'retirement').length }
  ];

  const filteredCourses = selectedCategory === 'all' 
    ? courses 
    : courses.filter(course => course.category === selectedCategory);

  const completedCourses = courses.filter(course => course.completed).length;
  const totalProgress = courses.reduce((sum, course) => sum + course.progress, 0) / courses.length;

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...courseFormData,
          duration: parseInt(courseFormData.duration) * 60, // Convert hours to minutes
          lessons: parseInt(courseFormData.lessons)
        })
      });

      if (response.ok) {
        await loadCourses();
        setShowCourseForm(false);
        setCourseFormData({
          title: '',
          description: '',
          category: 'basics',
          level: 'beginner',
          duration: '',
          lessons: '',
          imageUrl: ''
        });
      }
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseFormData({
      title: course.title,
      description: course.description || '',
      category: course.category,
      level: course.level,
      duration: course.duration.replace(' hours', ''),
      lessons: course.lessons.toString(),
      imageUrl: ''
    });
    setShowCourseForm(true);
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCourse) return;

    try {
      const response = await fetch(`/api/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...courseFormData,
          duration: parseInt(courseFormData.duration) * 60,
          lessons: parseInt(courseFormData.lessons)
        })
      });

      if (response.ok) {
        await loadCourses();
        setShowCourseForm(false);
        setEditingCourse(null);
        setCourseFormData({
          title: '',
          description: '',
          category: 'basics',
          level: 'beginner',
          duration: '',
          lessons: '',
          imageUrl: ''
        });
      }
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadCourses();
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  if (authLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Please Login</h3>
        <p className="text-gray-600 mb-8">You need to be logged in to access your learning dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financial Education</h1>
          <p className="text-gray-600">Learn and master personal finance at your own pace</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Admin Panel
          </button>
          {showAdminPanel && (
            <button
              onClick={() => {
                setShowCourseForm(true);
                setEditingCourse(null);
                setCourseFormData({
                  title: '',
                  description: '',
                  category: 'basics',
                  level: 'beginner',
                  duration: '',
                  lessons: '',
                  imageUrl: ''
                });
              }}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Course
            </button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Courses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{courses.length}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{completedCourses}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Overall Progress</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalProgress.toFixed(0)}%</p>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const Icon = course.icon;
          return (
            <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-gray-600">{course.rating}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.lessons} lessons</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Level Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                  course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                </span>
                {course.completed && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    // Navigate to course learning page
                    window.location.href = `/learn/${course.id}`;
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {course.completed ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Review Course</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>{course.progress > 0 ? 'Continue' : 'Start Course'}</span>
                    </>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                {showAdminPanel && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditCourse(course)}
                      className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="flex-1 px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Learning Tips */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Start with Basics</h4>
              <p className="text-sm text-gray-600">Begin with fundamental concepts before moving to advanced topics.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Set Learning Goals</h4>
              <p className="text-sm text-gray-600">Define what you want to achieve and track your progress.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Consistent Practice</h4>
              <p className="text-sm text-gray-600">Dedicate regular time to learning and applying concepts.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Apply Knowledge</h4>
              <p className="text-sm text-gray-600">Use what you learn in your daily financial decisions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course Form Modal */}
      {showCourseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCourse ? 'Edit Course' : 'Add New Course'}
            </h3>
            
            <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={courseFormData.title}
                  onChange={(e) => setCourseFormData({...courseFormData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({...courseFormData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={courseFormData.category}
                    onChange={(e) => setCourseFormData({...courseFormData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="basics">Basics</option>
                    <option value="investing">Investing</option>
                    <option value="debt">Debt Management</option>
                    <option value="planning">Planning</option>
                    <option value="taxes">Taxes</option>
                    <option value="retirement">Retirement</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    value={courseFormData.level}
                    onChange={(e) => setCourseFormData({...courseFormData, level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                  <input
                    type="number"
                    value={courseFormData.duration}
                    onChange={(e) => setCourseFormData({...courseFormData, duration: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lessons</label>
                  <input
                    type="number"
                    value={courseFormData.lessons}
                    onChange={(e) => setCourseFormData({...courseFormData, lessons: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={courseFormData.imageUrl}
                  onChange={(e) => setCourseFormData({...courseFormData, imageUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {editingCourse ? 'Update Course' : 'Create Course'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCourseForm(false);
                    setEditingCourse(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
