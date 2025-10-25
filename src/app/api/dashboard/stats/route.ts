import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Fetches dashboard statistics.
 *     description: Retrieves key financial statistics for a user's dashboard based on a specified period.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         description: The ID of the user to fetch stats for.
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         required: false
 *         description: The period to calculate stats for (e.g., 'current_month', 'last_month', 'current_year').
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful response with dashboard stats.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       '400':
 *         description: Bad request, missing user ID.
 *       '500':
 *         description: Internal server error.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = searchParams.get('period') || 'current_month'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Calculate date range based on period
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (period) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    // Get income sources
    const incomeSources = await prisma.incomeSource.findMany({
      where: {
        userId: userId,
        isActive: true,
        startDate: {
          lte: endDate,
        },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } },
        ],
      },
    })

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Get deadlines
    const upcomingDeadlines = await prisma.deadline.count({
      where: {
        userId: userId,
        dueDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        },
        status: 'PENDING',
      },
    })

    // Get active goals
    const activeGoals = await prisma.goal.count({
      where: {
        userId: userId,
        isActive: true,
      },
    })

    // Calculate totals
    const totalIncome = incomeSources.reduce((sum, source) => {
      const multiplier = getFrequencyMultiplier(source.frequency, startDate, endDate)
      return sum + (parseFloat(source.amount.toString()) * multiplier)
    }, 0)

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + parseFloat(expense.amount.toString())
    }, 0)

    const netCashFlow = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0

    // Calculate financial health score (simplified)
    const financialHealthScore = calculateFinancialHealthScore(
      totalIncome,
      totalExpenses,
      savingsRate,
      upcomingDeadlines
    )

    const stats = {
      totalIncome,
      totalExpenses,
      netCashFlow,
      savingsRate: Math.round(savingsRate * 100) / 100,
      upcomingDeadlines,
      activeGoals,
      financialHealthScore,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

/**
 * Calculates a multiplier based on the frequency of an income source.
 *
 * @param {string} frequency - The frequency of the income source.
 * @param {Date} startDate - The start date of the period.
 * @param {Date} endDate - The end date of the period.
 * @returns {number} The multiplier to use for the income source.
 */
function getFrequencyMultiplier(frequency: string, startDate: Date, endDate: Date): number {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  switch (frequency) {
    case 'DAILY':
      return daysDiff
    case 'WEEKLY':
      return Math.ceil(daysDiff / 7)
    case 'MONTHLY':
      return Math.ceil(daysDiff / 30)
    case 'YEARLY':
      return Math.ceil(daysDiff / 365)
    case 'ONE_TIME':
      return 1
    default:
      return 1
  }
}

/**
 * Calculates the financial health score.
 *
 * @param {number} income - The total income.
 * @param {number} expenses - The total expenses.
 * @param {number} savingsRate - The savings rate.
 * @param {number} upcomingDeadlines - The number of upcoming deadlines.
 * @returns {number} The financial health score.
 */
function calculateFinancialHealthScore(
  income: number,
  expenses: number,
  savingsRate: number,
  upcomingDeadlines: number
): number {
  let score = 0

  // Savings rate component (40% weight)
  if (savingsRate >= 20) score += 40
  else if (savingsRate >= 10) score += 30
  else if (savingsRate >= 5) score += 20
  else if (savingsRate >= 0) score += 10

  // Income vs expenses ratio (30% weight)
  const expenseRatio = expenses / income
  if (expenseRatio <= 0.7) score += 30
  else if (expenseRatio <= 0.8) score += 25
  else if (expenseRatio <= 0.9) score += 20
  else if (expenseRatio <= 1.0) score += 10

  // Upcoming deadlines (20% weight)
  if (upcomingDeadlines === 0) score += 20
  else if (upcomingDeadlines <= 2) score += 15
  else if (upcomingDeadlines <= 5) score += 10
  else score += 5

  // Overall financial stability (10% weight)
  if (income > 0 && expenses > 0) score += 10

  return Math.min(100, Math.max(0, score))
}