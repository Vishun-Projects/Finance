import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');

    // For now, always return default courses to avoid database issues
    // TODO: Implement proper database integration later
    const defaultCourses = [
        {
          id: 'default-1',
          title: "Personal Finance Fundamentals for Indians",
          description: "Master the basics of personal finance tailored for the Indian market, including banking, insurance, and tax-saving instruments.",
          category: "basics",
          level: "beginner",
          duration: 120,
          lessons: 8,
          rating: 4.8,
          imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
          progress: 0,
          isCompleted: false,
          completedModules: 0,
          totalModules: 3,
          modules: [
            {
              id: 'mod-1',
              title: "Introduction to Personal Finance in India",
              description: "Understanding the Indian financial landscape and key concepts",
              content: "Learn about Indian banking system, key financial products, and cultural aspects of money management.",
              duration: 15,
              order: 1
            },
            {
              id: 'mod-2',
              title: "Banking and Payment Systems",
              description: "Modern banking in India - UPI, digital payments, and traditional banking",
              content: "Explore UPI, digital wallets, and security measures in Indian banking.",
              duration: 20,
              order: 2
            },
            {
              id: 'mod-3',
              title: "Insurance Essentials for Indian Families",
              description: "Life, health, and general insurance products available in India",
              content: "Understand different types of insurance and government schemes like PMJJBY, PMSBY.",
              duration: 25,
              order: 3
            }
          ]
        },
        {
          id: 'default-2',
          title: "Understanding Indian Stock Market",
          description: "Complete guide to investing in Indian stock markets - NSE, BSE, and key concepts for beginners.",
          category: "investing",
          level: "beginner",
          duration: 180,
          lessons: 10,
          rating: 4.7,
          imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop",
          progress: 0,
          isCompleted: false,
          completedModules: 0,
          totalModules: 3,
          modules: [
            {
              id: 'mod-4',
              title: "Introduction to Indian Stock Markets",
              description: "Understanding NSE, BSE, and how Indian stock markets work",
              content: "Learn about BSE (Asia's oldest stock exchange) and NSE, market timings, and key indices.",
              duration: 20,
              order: 1
            },
            {
              id: 'mod-5',
              title: "Opening a Demat and Trading Account",
              description: "Step-by-step guide to open your first trading account in India",
              content: "Understand Demat accounts, choosing brokers, and the account opening process.",
              duration: 25,
              order: 2
            },
            {
              id: 'mod-6',
              title: "Understanding Market Indices",
              description: "Learn about Nifty 50, Sensex, Bank Nifty, and other key indices",
              content: "Master the art of reading market indices and their significance in Indian markets.",
              duration: 15,
              order: 3
            }
          ]
        },
        {
          id: 'default-3',
          title: "Mutual Funds for Indian Investors",
          description: "Complete guide to mutual fund investing in India - types, selection, and portfolio building.",
          category: "investing",
          level: "intermediate",
          duration: 150,
          lessons: 8,
          rating: 4.9,
          imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop",
          progress: 0,
          isCompleted: false,
          completedModules: 0,
          totalModules: 3,
          modules: [
            {
              id: 'mod-7',
              title: "Understanding Mutual Funds in India",
              description: "What are mutual funds and how they work in the Indian context",
              content: "Learn about India's mutual fund industry growth from ₹8.25 lakh crore in 2014 to over ₹50 lakh crore in 2024.",
              duration: 20,
              order: 1
            },
            {
              id: 'mod-8',
              title: "Types of Mutual Funds",
              description: "Equity, debt, hybrid, and other types of mutual funds",
              content: "Understand different categories of mutual funds and their risk-return profiles.",
              duration: 25,
              order: 2
            },
            {
              id: 'mod-9',
              title: "SIP - Systematic Investment Plan",
              description: "Benefits and strategies of SIP investing",
              content: "Learn why SIP is India's favorite investment method and how to maximize its benefits.",
              duration: 15,
              order: 3
            }
          ]
        },
        {
          id: 'default-4',
          title: "Real Estate Investment in India",
          description: "Complete guide to real estate investment in India - residential, commercial, and REITs.",
          category: "investing",
          level: "intermediate",
          duration: 120,
          lessons: 6,
          rating: 4.6,
          imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop",
          progress: 0,
          isCompleted: false,
          completedModules: 0,
          totalModules: 2,
          modules: [
            {
              id: 'mod-10',
              title: "Real Estate Market in India",
              description: "Understanding the Indian real estate landscape and investment opportunities",
              content: "Explore residential vs commercial real estate, key markets, and RERA benefits.",
              duration: 20,
              order: 1
            },
            {
              id: 'mod-11',
              title: "REITs - New Way to Invest in Real Estate",
              description: "Understanding Real Estate Investment Trusts in India",
              content: "Learn about REITs as a modern way to invest in real estate without buying physical property.",
              duration: 15,
              order: 2
            }
          ]
        },
        {
          id: 'default-5',
          title: "Gold Investment Strategies",
          description: "Traditional and modern ways to invest in gold in India - physical, digital, and ETFs.",
          category: "investing",
          level: "beginner",
          duration: 90,
          lessons: 5,
          rating: 4.5,
          imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop",
          progress: 0,
          isCompleted: false,
          completedModules: 0,
          totalModules: 2,
          modules: [
            {
              id: 'mod-12',
              title: "Gold - India's Traditional Investment",
              description: "Understanding gold investment in the Indian context",
              content: "Learn about physical vs digital gold, Gold ETFs, and Sovereign Gold Bonds (SGBs).",
              duration: 18,
              order: 1
            },
            {
              id: 'mod-13',
              title: "Gold as Inflation Hedge",
              description: "How gold protects against inflation in India",
              content: "Understand why gold is considered a safe haven and its role in Indian investment portfolios.",
              duration: 12,
              order: 2
            }
          ]
        },
        {
          id: 'default-6',
          title: "Debt Management for Indians",
          description: "Managing various types of debt in India - credit cards, personal loans, home loans, and debt consolidation.",
          category: "debt",
          level: "beginner",
          duration: 120,
          lessons: 7,
          rating: 4.7,
          imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop",
          progress: 0,
          isCompleted: false,
          completedModules: 0,
          totalModules: 2,
          modules: [
            {
              id: 'mod-14',
              title: "Understanding Debt in India",
              description: "Types of debt and their impact on Indian families",
              content: "Learn about good vs bad debt, home loans, personal loans, and education loans.",
              duration: 17,
              order: 1
            },
            {
              id: 'mod-15',
              title: "Debt Consolidation Strategies",
              description: "How to consolidate and manage multiple debts",
              content: "Master debt consolidation techniques and create a debt-free future.",
              duration: 13,
              order: 2
            }
          ]
        },
        {
          id: 'default-7',
          title: "Retirement Planning in India",
          description: "Comprehensive retirement planning for Indians - NPS, EPF, and other retirement instruments.",
          category: "retirement",
          level: "intermediate",
          duration: 150,
          lessons: 8,
          rating: 4.8,
          imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop",
          progress: 0,
          isCompleted: false,
          completedModules: 0,
          totalModules: 2,
          modules: [
            {
              id: 'mod-16',
              title: "Retirement Planning - Start Early",
              description: "Why retirement planning is crucial for Indians and how to start",
              content: "Understand EPF, NPS, PPF, and healthcare costs in retirement.",
              duration: 19,
              order: 1
            },
            {
              id: 'mod-17',
              title: "Building Retirement Corpus",
              description: "Strategies to build a sufficient retirement fund",
              content: "Learn about the power of compounding and how to calculate your retirement needs.",
              duration: 16,
              order: 2
            }
          ]
        },
        {
          id: 'default-8',
          title: "Tax Planning and Filing",
          description: "Complete guide to Indian tax system - ITR filing, deductions, and tax-saving strategies.",
          category: "taxes",
          level: "intermediate",
          duration: 180,
          lessons: 10,
          rating: 4.6,
          imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop",
          progress: 0,
          isCompleted: false,
          completedModules: 0,
          totalModules: 2,
          modules: [
            {
              id: 'mod-18',
              title: "Understanding Indian Tax System",
              description: "Overview of income tax in India and tax slabs",
              content: "Learn about income tax slabs, old vs new tax regime, and deductions.",
              duration: 18,
              order: 1
            },
            {
              id: 'mod-19',
              title: "Tax-Saving Instruments (Section 80C)",
              description: "Maximize your tax savings with Indian tax-saving instruments",
              content: "Explore ELSS, PPF, NSC, and other tax-saving options under Section 80C.",
              duration: 22,
              order: 2
            }
          ]
        }
      ];

      // Filter by category if specified
      const filteredCourses = category && category !== 'all' 
        ? defaultCourses.filter(course => course.category === category)
        : defaultCourses;

    return NextResponse.json(filteredCourses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, level, duration, lessons, imageUrl } = body;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        category,
        level,
        duration,
        lessons,
        imageUrl
      }
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
