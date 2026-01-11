import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import fs from 'fs';
import path from 'path';

// Chat history storage
const CHAT_HISTORY_FILE = path.join(process.cwd(), 'data', 'chat_history.json');

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(CHAT_HISTORY_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Load chat history
const loadChatHistory = (userId: string) => {
  try {
    ensureDataDir();
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf8'));
      return data[userId] || [];
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
  return [];
};

// Save chat history
const saveChatHistory = (userId: string, message: string, response: string) => {
  try {
    ensureDataDir();
    let data: any = {};
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      data = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf8'));
    }

    if (!data[userId]) data[userId] = [];

    data[userId].push({
      timestamp: new Date().toISOString(),
      message,
      response,
      userId
    });

    // Keep only last 100 messages per user
    if (data[userId].length > 100) {
      data[userId] = data[userId].slice(-100);
    }

    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 Chat History - Saved for user ${userId}`);
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
};

// Simple market trends data
const getMarketTrends = () => {
  return {
    timestamp: Date.now(),
    stocks: {
      sensex: { trend: 'bullish', change: '+0.8%', value: '74,000' },
      nifty: { trend: 'bullish', change: '+0.7%', value: '22,500' },
      bankNifty: { trend: 'neutral', change: '+0.2%', value: '48,000' }
    },
    crypto: {
      bitcoin: { trend: 'bullish', change: '+2.1%', value: '$65,000' },
      ethereum: { trend: 'bullish', change: '+1.8%', value: '$3,200' }
    },
    commodities: {
      gold: { trend: 'bullish', change: '+0.9%', value: '₹6,200/g' },
      silver: { trend: 'neutral', change: '+0.3%', value: '₹75,000/kg' }
    }
  };
};

interface FinancialAnalysis {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  incomeSources: Array<{
    name: string;
    amount: number;
    frequency: string;
  }>;
  recentTransactions: Array<{
    type: 'income' | 'expense';
    title: string;
    amount: number;
    date: string;
  }>;
  financialHealth: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, query, message } = body;

    // Accept both 'message' and 'query' for compatibility
    const userQuery = query || message;

    if (!userId || !userQuery) {
      return NextResponse.json({ error: 'User ID and message are required' }, { status: 400 });
    }

    console.log('🤖 AI Analysis - Starting analysis for user:', userId, 'Query:', userQuery);

    // Load chat history for context
    const chatHistory = loadChatHistory(userId);
    const recentContext = chatHistory.slice(-5); // Last 5 messages for context

    console.log(`🤖 AI Chat - User: ${userId}, Message: "${userQuery}"`);
    console.log(`📚 Chat History Context: ${recentContext.length} recent messages`);

    // Fetch user's financial data
    const [goals, deadlines, incomes, expenses] = await Promise.all([
      prisma.goal.findMany({ where: { userId } }),
      prisma.deadline.findMany({ where: { userId } }),
      prisma.incomeSource.findMany({ where: { userId } }),
      prisma.expense.findMany({ where: { userId } })
    ]);

    console.log('🔍 AI Analysis - Data fetched:', {
      incomes: incomes.length,
      expenses: expenses.length,
      goals: goals.length,
      deadlines: deadlines.length
    });

    // Debug: Log actual data
    console.log('🔍 AI Analysis - Sample income data:', incomes.slice(0, 2));
    console.log('🔍 AI Analysis - Sample expense data:', expenses.slice(0, 2));
    console.log('🔍 AI Analysis - User ID being used:', userId);

    // Check if we're getting data from the right user
    if (incomes.length === 0 && expenses.length === 0) {
      console.warn('⚠️ AI Analysis - No financial data found for user:', userId);
      console.warn('⚠️ AI Analysis - This might be a user ID mismatch or database issue');
    }

    // Calculate financial metrics
    const totalIncome = incomes.reduce((sum: number, income: any) => sum + parseFloat(income.amount), 0);
    const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Calculate monthly trends (last 6 months) - Only show months with data
    const monthlyTrends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    for (let i = 0; i < 6; i++) {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      const monthName = months[monthIndex];

      const monthIncome = incomes
        .filter((income: any) => {
          const incomeDate = new Date(income.startDate);
          return incomeDate.getMonth() === monthIndex;
        })
        .reduce((sum: number, income: any) => sum + parseFloat(income.amount), 0);

      const monthExpenses = expenses
        .filter((expense: any) => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getMonth() === monthIndex;
        })
        .reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);

      const monthSavings = monthIncome - monthExpenses;

      // Only add month if there's actual data
      if (monthIncome > 0 || monthExpenses > 0) {
        monthlyTrends.push({
          month: monthName,
          income: monthIncome,
          expenses: monthExpenses,
          savings: monthSavings
        });
      }
    }

    // Calculate expense categories
    const categoryBreakdown = expenses.reduce((acc: any, expense: any) => {
      const category = expense.category || 'Uncategorized';
      if (!acc[category]) acc[category] = 0;
      acc[category] += parseFloat(expense.amount);
      return acc;
    }, {});

    const topExpenseCategories = Object.entries(categoryBreakdown)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([category, amount]: any) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }));

    // Get income sources
    const incomeSources = incomes.map((income: any) => ({
      name: income.name || 'Income',
      amount: parseFloat(income.amount),
      frequency: income.frequency || 'Monthly'
    }));

    // Get recent transactions
    const recentTransactions = [...incomes, ...expenses]
      .map((item: any) => ({
        type: ('income' in item ? 'income' : 'expense') as 'income' | 'expense',
        title: (item.name || item.description || 'Transaction') as string,
        amount: parseFloat(item.amount),
        date: (item.startDate || item.date) as string
      }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Calculate financial health score
    let healthScore = 0;
    let healthStatus = 'Poor';
    const recommendations: string[] = [];

    // Income stability scoring
    if (incomeSources.length > 1) {
      healthScore += 20;
      recommendations.push('Multiple income sources - Good diversification!');
    }

    // Savings rate scoring
    if (savingsRate >= 20) {
      healthScore += 25;
      healthStatus = 'Excellent';
    } else if (savingsRate >= 10) {
      healthScore += 20;
      healthStatus = 'Good';
    } else if (savingsRate >= 0) {
      healthScore += 15;
      healthStatus = 'Fair';
    } else {
      healthScore += 5;
      healthStatus = 'Critical';
      recommendations.push('⚠️ CRISIS ALERT: You\'re spending more than earning!');
    }

    // Expense management scoring
    if (expenses.length > 0) {
      const avgExpense = totalExpenses / expenses.length;
      if (avgExpense < totalIncome * 0.1) {
        healthScore += 25;
      } else if (avgExpense < totalIncome * 0.3) {
        healthScore += 20;
      } else if (avgExpense < totalIncome * 0.5) {
        healthScore += 15;
      } else {
        healthScore += 5;
      }
    }

    // Goal progress scoring
    if (goals.length > 0) {
      const activeGoals = goals.filter((g: any) => g.status === 'active');
      if (activeGoals.length > 0) {
        healthScore += 15;
        recommendations.push(`You have ${activeGoals.length} active financial goals - Stay focused!`);
      }
    }

    // Deadline management scoring
    if (deadlines.length > 0) {
      const upcomingDeadlines = deadlines.filter((d: any) => {
        const deadlineDate = new Date(d.dueDate);
        const daysUntil = (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntil > 0 && daysUntil <= 30;
      });
      if (upcomingDeadlines.length > 0) {
        healthScore += 15;
        recommendations.push(`⚠️ You have ${upcomingDeadlines.length} upcoming deadlines this month!`);
      }
    }

    // Add default recommendations if none exist
    if (recommendations.length === 0) {
      if (netSavings < 1000) {
        recommendations.push('Build emergency fund - Aim for ₹10,000 minimum');
      }
      if (topExpenseCategories.length > 0 && topExpenseCategories[0].category === 'Uncategorized') {
        recommendations.push('Categorize your expenses for better tracking');
      }
      if (incomeSources.length === 1) {
        recommendations.push('Consider side hustles to diversify income');
      }
    }

    const financialAnalysis: FinancialAnalysis = {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      monthlyTrends,
      topExpenseCategories,
      incomeSources,
      recentTransactions,
      financialHealth: {
        score: healthScore,
        status: healthStatus as 'excellent' | 'good' | 'fair' | 'poor',
        recommendations
      }
    };

    console.log('✅ AI Analysis - Analysis completed successfully');

    // If there's a specific query, provide targeted response
    if (userQuery) {
      const queryLower = userQuery.toLowerCase();
      let response = '';

      if (queryLower.includes('income') || queryLower.includes('earn')) {
        response = `Your total income is ₹${totalIncome.toLocaleString()}. `;
        if (incomeSources.length > 0) {
          response += `Your income sources include: ${incomeSources.map((s: any) => `${s.name} (₹${s.amount.toLocaleString()})`).join(', ')}. `;
        }
        if (monthlyTrends.length > 0) {
          const avgMonthlyIncome = monthlyTrends.reduce((sum, month) => sum + month.income, 0) / monthlyTrends.length;
          response += `Your average monthly income is ₹${avgMonthlyIncome.toLocaleString()}.`;
        }
      } else if (queryLower.includes('expense') || queryLower.includes('spend')) {
        response = `Your total expenses are ₹${totalExpenses.toLocaleString()}. `;
        if (topExpenseCategories.length > 0) {
          response += `Your top expense categories are: ${topExpenseCategories.slice(0, 3).map(c => `${c.category} (₹${c.amount.toLocaleString()})`).join(', ')}. `;
        }
        if (monthlyTrends.length > 0) {
          const avgMonthlyExpenses = monthlyTrends.reduce((sum, month) => sum + month.expenses, 0) / monthlyTrends.length;
          response += `Your average monthly expenses are ₹${avgMonthlyExpenses.toLocaleString()}.`;
        }
      } else if (queryLower.includes('savings') || queryLower.includes('save')) {
        response = `Your net savings are ₹${netSavings.toLocaleString()} with a savings rate of ${savingsRate.toFixed(1)}%. `;
        if (netSavings < 0) {
          response += `You are currently spending more than you earn. Consider reviewing your budget.`;
        } else if (savingsRate < 20) {
          response += `Your savings rate is below the recommended 20%. Consider increasing your savings.`;
        } else {
          response += `Great job maintaining a healthy savings rate!`;
        }
      } else if (queryLower.includes('trend') || queryLower.includes('pattern')) {
        if (monthlyTrends.length > 0) {
          response = `Your monthly trends show: ${monthlyTrends.map(m => `${m.month}: Income ₹${m.income.toLocaleString()}, Expenses ₹${m.expenses.toLocaleString()}, Savings ₹${m.savings.toLocaleString()}`).join('; ')}.`;
        } else {
          response = `No monthly trend data available yet. You need at least 2-3 months of consistent data to see patterns. Currently you have ${incomes.length} income entries and ${expenses.length} expense entries.`;
        }
      } else if (queryLower.includes('goal') || queryLower.includes('plan')) {
        // Read and analyze actual goals data
        if (goals.length > 0) {
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();

          // Find current month goals
          const currentMonthGoals = goals.filter((goal: any) => {
            const goalDate = new Date(goal.targetDate || goal.createdAt);
            return goalDate.getMonth() === currentMonth && goalDate.getFullYear() === currentYear;
          });

          if (currentMonthGoals.length > 0) {
            response = `Your current month goals (${new Date().toLocaleString('default', { month: 'long' })} ${currentYear}):\n`;
            currentMonthGoals.forEach((goal: any, index: number) => {
              const targetAmount = goal.targetAmount ? parseFloat(goal.targetAmount) : 0;
              const currentAmount = goal.currentAmount ? parseFloat(goal.currentAmount) : 0;
              const progress = targetAmount > 0 ? ((currentAmount / targetAmount) * 100).toFixed(1) : 0;

              response += `${index + 1}. ${goal.title || goal.name || 'Goal'}: ₹${targetAmount.toLocaleString()} target, ₹${currentAmount.toLocaleString()} saved (${progress}%)\n`;
            });
          } else {
            response = `No specific goals set for ${new Date().toLocaleString('default', { month: 'long' })} ${currentYear}. `;
          }

          // Show all active goals
          const activeGoals = goals.filter((goal: any) => {
            const targetDate = new Date(goal.targetDate || goal.createdAt);
            return targetDate > new Date() || !goal.isCompleted;
          });

          if (activeGoals.length > 0) {
            response += `\nYour active goals:\n`;
            activeGoals.slice(0, 5).forEach((goal: any, index: number) => {
              const targetAmount = goal.targetAmount ? parseFloat(goal.targetAmount) : 0;
              const currentAmount = goal.currentAmount ? parseFloat(goal.currentAmount) : 0;
              const targetDate = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'No deadline';

              response += `${index + 1}. ${goal.title || goal.name || 'Goal'}: ₹${targetAmount.toLocaleString()} by ${targetDate} (₹${currentAmount.toLocaleString()}/${targetAmount.toLocaleString()})\n`;
            });
          }
        } else {
          response = `No goals found in your database. Consider setting financial goals to stay motivated and track progress.`;
        }
      } else if (queryLower.includes('deadline') || queryLower.includes('due')) {
        // Read and analyze actual deadlines data
        if (deadlines.length > 0) {
          const now = new Date();
          const upcomingDeadlines = deadlines.filter((deadline: any) => {
            const dueDate = new Date(deadline.dueDate);
            return dueDate > now;
          }).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

          const overdueDeadlines = deadlines.filter((deadline: any) => {
            const dueDate = new Date(deadline.dueDate);
            return dueDate < now;
          });

          if (overdueDeadlines.length > 0) {
            response = `🚨 OVERDUE DEADLINES (${overdueDeadlines.length}):\n`;
            overdueDeadlines.forEach((deadline: any, index: number) => {
              const daysOverdue = Math.ceil((now.getTime() - new Date(deadline.dueDate).getTime()) / (1000 * 60 * 60 * 24));
              response += `${index + 1}. ${deadline.title || deadline.name || 'Deadline'}: Due ${new Date(deadline.dueDate).toLocaleDateString()} (${daysOverdue} days overdue)\n`;
            });
            response += '\n';
          }

          if (upcomingDeadlines.length > 0) {
            response += `📅 UPCOMING DEADLINES (${upcomingDeadlines.length}):\n`;
            upcomingDeadlines.slice(0, 10).forEach((deadline: any, index: number) => {
              const dueDate = new Date(deadline.dueDate);
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const priority = deadline.priority || 'Medium';

              response += `${index + 1}. ${deadline.title || deadline.name || 'Deadline'}: Due ${dueDate.toLocaleDateString()} (${daysUntilDue} days) - Priority: ${priority}\n`;
            });
          } else {
            response += `No upcoming deadlines found.`;
          }
        } else {
          response = `No deadlines found in your database.`;
        }
      } else if (queryLower.includes('emergency') || queryLower.includes('fund')) {
        const recommendedEmergencyFund = totalExpenses * 3;
        if (netSavings < recommendedEmergencyFund) {
          response = `You need ₹${recommendedEmergencyFund.toLocaleString()} for a 3-month emergency fund. You currently have ₹${netSavings.toLocaleString()}. Save ₹${Math.ceil((recommendedEmergencyFund - netSavings) / 12).toLocaleString()}/month to reach this goal.`;
        } else {
          response = `Excellent! You have ₹${netSavings.toLocaleString()} saved, which covers your emergency fund needs. Consider investing excess savings.`;
        }
      } else if (queryLower.includes('invest') || queryLower.includes('investment')) {
        if (netSavings < 10000) {
          response = `Focus on building your emergency fund first. Once you have ₹10,000+ saved, start with ₹500/month in mutual fund SIPs. Don't invest money you might need soon.`;
        } else {
          response = `Great! With ₹${netSavings.toLocaleString()} saved, you can start investing. Consider: 1) Keep ₹15,000 as emergency fund, 2) Invest ₹${Math.floor((netSavings - 15000) * 0.7).toLocaleString()} in mutual funds, 3) Put ₹${Math.floor((netSavings - 15000) * 0.3).toLocaleString()} in PPF for long-term.`;
        }
      } else if (queryLower.includes('budget') || queryLower.includes('track')) {
        if (topExpenseCategories.some(c => c.category === 'Uncategorized' && c.percentage > 50)) {
          response = `CRITICAL: ${topExpenseCategories.find(c => c.category === 'Uncategorized')?.percentage.toFixed(1)}% of your expenses are uncategorized! You MUST start tracking every expense. Download a budget app TODAY and record every ₹ spent. This is your biggest financial problem.`;
        } else {
          response = `Good job tracking expenses! Your top categories are: ${topExpenseCategories.slice(0, 3).map(c => `${c.category} (${c.percentage.toFixed(1)}%)`).join(', ')}. Consider reducing the highest category.`;
        }
      } else if (queryLower.includes('side hustle') || queryLower.includes('extra income')) {
        const avgMonthlyIncome = monthlyTrends.length > 0 ? monthlyTrends.reduce((sum, month) => sum + month.income, 0) / monthlyTrends.length : totalIncome / 6;
        if (avgMonthlyIncome < 30000) {
          response = `With ₹${avgMonthlyIncome.toLocaleString()}/month income, you need additional sources. Consider: 1) Freelancing (₹5,000-15,000/month), 2) Online tutoring (₹3,000-8,000/month), 3) Delivery/ride-sharing (₹8,000-20,000/month), 4) Selling skills online (₹2,000-10,000/month). Start with what you're good at!`;
        } else {
          response = `Your income of ₹${avgMonthlyIncome.toLocaleString()}/month is decent. For extra income, consider: 1) Investment income (₹2,000-5,000/month), 2) Passive income streams, 3) Skill-based freelancing. Focus on building wealth, not just earning more.`;
        }
      } else if (queryLower.includes('web developer') || queryLower.includes('laravel') || queryLower.includes('next') || queryLower.includes('node') || queryLower.includes('project') || queryLower.includes('freelance')) {
        // Special handling for web developer queries
        response = `🎯 PERFECT! As a web developer with Laravel, Next.js, and Node.js skills, here are specific project ideas:\n\n`;
        response += `💰 HIGH-PAYING PROJECTS:\n`;
        response += `1. E-commerce Platform (₹15,000-50,000): Laravel backend + Next.js frontend\n`;
        response += `2. SaaS Dashboard (₹20,000-80,000): Admin panels, analytics, user management\n`;
        response += `3. API Development (₹8,000-25,000): RESTful APIs, payment gateways, integrations\n`;
        response += `4. Real-time Apps (₹12,000-40,000): Chat apps, live tracking, notifications\n\n`;
        response += `🚀 PLATFORMS TO FIND CLIENTS:\n`;
        response += `• Upwork: Start with ₹2,000-5,000 projects\n`;
        response += `• Fiverr: Package deals ₹3,000-15,000\n`;
        response += `• Freelancer.com: Bid on projects\n`;
        response += `• LinkedIn: Network with businesses\n\n`;
        response += `📈 MONTHLY EARNING POTENTIAL: ₹25,000-80,000\n`;
        response += `Start with 2-3 small projects, then scale up!`;
      } else if (queryLower.includes('suggest') || queryLower.includes('advice') || queryLower.includes('recommend')) {
        // Context-aware suggestions based on user's situation
        if (netSavings <= 1000) {
          response = `💡 SPECIFIC SUGGESTIONS FOR YOUR ₹${netSavings.toLocaleString()} SITUATION:\n\n`;
          response += `🚨 IMMEDIATE ACTIONS (This Week):\n`;
          response += `1. Download Money Manager app TODAY\n`;
          response += `2. Track every ₹ spent (even ₹10 for tea)\n`;
          response += `3. Set up ₹100/day automatic savings\n`;
          response += `4. Create emergency fund goal: ₹5,000\n\n`;
          response += `💼 INCOME BOOST (Next 2 Weeks):\n`;
          response += `• Freelance web development: ₹5,000-15,000/month\n`;
          response += `• Online tutoring: ₹3,000-8,000/month\n`;
          response += `• Sell digital products: ₹2,000-10,000/month\n\n`;
          response += `📊 BUDGET PLAN:\n`;
          response += `• Essential needs: 70% of income\n`;
          response += `• Savings: 20% of income\n`;
          response += `• Wants: 10% of income\n\n`;
          response += `🎯 30-DAY GOAL: Save ₹3,000 (₹100/day)`;
        } else if (netSavings <= 10000) {
          response = `📈 BUILDING STABILITY SUGGESTIONS:\n\n`;
          response += `1. Emergency Fund: Aim for ₹15,000 (3 months expenses)\n`;
          response += `2. Start Investing: ₹1,000/month in mutual funds\n`;
          response += `3. Skill Development: Advanced web development courses\n`;
          response += `4. Passive Income: Create and sell digital products`;
        } else {
          response = `🎯 WEALTH BUILDING SUGGESTIONS:\n\n`;
          response += `1. Emergency Fund: ₹30,000 (6 months)\n`;
          response += `2. Investment Portfolio: 60% equity, 30% debt, 10% gold\n`;
          response += `3. Business Expansion: Scale your web development services\n`;
          response += `4. Tax Planning: PPF, ELSS, health insurance`;
        }
      } else if (queryLower.includes('debt') || queryLower.includes('loan')) {
        response = `I don't see debt data in your records. If you have loans, prioritize paying high-interest debt first. The rule is: 1) Emergency fund, 2) High-interest debt (credit cards, personal loans), 3) Low-interest debt (home loans), 4) Savings and investments.`;
      } else if (queryLower.includes('crisis') || queryLower.includes('help') || queryLower.includes('emergency')) {
        // Special handling for crisis/help queries
        if (netSavings <= 1000) {
          response = `🚨 FINANCIAL CRISIS MODE: You have only ₹${netSavings.toLocaleString()} saved. Here's your survival plan: 1) Start tracking EVERY expense TODAY, 2) Build ₹5,000 emergency fund (save ₹100/day), 3) Find extra income (freelancing, tutoring, delivery), 4) Cut unnecessary expenses. You can turn this around in 3-6 months with discipline!`;
        } else if (netSavings < 0) {
          response = `🚨 FINANCIAL EMERGENCY: You're spending more than you earn! Immediate action required: 1) Stop all non-essential spending, 2) Create strict budget, 3) Find additional income sources, 4) Build emergency fund. This is fixable with immediate action!`;
        } else {
          response = `You're not in crisis, but you need to improve. Focus on: 1) Better expense tracking, 2) Increase savings rate to 20%, 3) Build emergency fund, 4) Start investing. You're on the right track!`;
        }
      } else {
        // Comprehensive financial overview - FIXED LOGIC
        response = `Here's your financial snapshot: Income ₹${totalIncome.toLocaleString()}, Expenses ₹${totalExpenses.toLocaleString()}, Savings ₹${netSavings.toLocaleString()}, Health Score ${healthScore}/100 (${healthStatus}). `;

        if (netSavings < 0) {
          response += `🚨 CRISIS: You're spending more than you earn! This is unsustainable. Immediate action required.`;
        } else if (netSavings <= 1000) {
          response += `💰 SURVIVAL MODE: With ₹${netSavings.toLocaleString()} saved, focus on: 1) Track every expense, 2) Build ₹5,000 emergency fund, 3) Find extra income. Start small - ₹100/day = ₹3,000/month!`;
        } else if (netSavings <= 10000) {
          response += `📈 BUILDING STABILITY: You have ₹${netSavings.toLocaleString()} saved. Next steps: 1) Emergency fund to ₹15,000, 2) Start investing ₹1,000/month, 3) Set specific financial goals.`;
        } else {
          response += `🎯 DOING WELL: Great job with ₹${netSavings.toLocaleString()}! Consider: 1) Emergency fund to ₹30,000, 2) Invest 20% of savings, 3) Plan for major purchases or retirement.`;
        }

        // Add context-aware follow-up
        if (queryLower.includes('web') || queryLower.includes('developer') || queryLower.includes('tech')) {
          response += `\n\n💻 AS A WEB DEVELOPER: Your skills are in high demand! Focus on freelancing to boost income quickly.`;
        }
      }

      // If no specific response was generated, provide a general helpful response
      if (!response) {
        response = `I understand you're asking about "${userQuery}". Here's what I can help you with:\n\n`;
        response += `💰 **Budget & Expenses**: Ask me to "optimize my budget" or "track my expenses"\n`;
        response += `💵 **Income & Savings**: Ask me about "my income" or "savings rate"\n`;
        response += `📈 **Financial Trends**: Ask about "monthly trends" or "spending patterns"\n`;
        response += `🎯 **Goals & Planning**: Ask about "my goals" or "financial planning"\n`;
        response += `💡 **Investment Advice**: Ask about "investment options" or "side hustles"\n\n`;
        response += `Your current financial status: ₹${totalIncome.toLocaleString()} income, ₹${totalExpenses.toLocaleString()} expenses, ₹${netSavings.toLocaleString()} savings.`;
      }

      // Save chat history for future context
      if (userQuery) { // Only save if there's a query
        saveChatHistory(userId, userQuery, response);
        console.log(`💾 Chat History - Saved conversation for user ${userId}`);
      }

      return NextResponse.json({
        analysis: financialAnalysis,
        query: userQuery,
        response: response,
        chatHistory: loadChatHistory(userId).slice(-10), // Return last 10 messages for context
        marketTrends: getMarketTrends()
      });
    }

    return NextResponse.json({
      analysis: financialAnalysis,
      message: 'Financial analysis completed successfully'
    });

  } catch (error) {
    console.error('❌ AI Analysis - Error:', error);
    return NextResponse.json({
      error: 'Failed to analyze financial data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
