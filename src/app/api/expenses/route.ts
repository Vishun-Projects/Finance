import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Fetches expenses.
 *     description: Retrieves a list of expenses for a user within a specified date range.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         description: The ID of the user to fetch expenses for.
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: false
 *         description: The start date of the period to fetch expenses for.
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         required: false
 *         description: The end date of the period to fetch expenses for.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful response with a list of expenses.
 *       '400':
 *         description: Bad request, missing user ID.
 *       '500':
 *         description: Internal server error.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const whereClause: any = {
      userId: userId,
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: expenses,
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Creates a new expense.
 *     description: Adds a new expense record to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               isRecurring:
 *                 type: boolean
 *               frequency:
 *                 type: string
 *               notes:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successful response with the created expense.
 *       '400':
 *         description: Bad request, missing required fields.
 *       '500':
 *         description: Internal server error.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      amount,
      description,
      date,
      categoryId,
      isRecurring,
      frequency,
      notes,
      userId,
    } = body

    if (!amount || !date || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        description: description || null,
        date: new Date(date),
        categoryId: categoryId || null,
        isRecurring: isRecurring || false,
        frequency: frequency || null,
        notes: notes || null,
        userId,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}