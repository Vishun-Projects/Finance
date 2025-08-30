import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const incomeSources = await prisma.incomeSource.findMany({
      where: {
        userId: userId,
        isActive: true,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: incomeSources,
    })
  } catch (error) {
    console.error('Error fetching income sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch income sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      amount,
      frequency,
      categoryId,
      startDate,
      endDate,
      notes,
      userId,
    } = body

    if (!name || !amount || !frequency || !startDate || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const incomeSource = await prisma.incomeSource.create({
      data: {
        name,
        amount: parseFloat(amount),
        frequency,
        categoryId: categoryId || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
        userId,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: incomeSource,
      message: 'Income source created successfully',
    })
  } catch (error) {
    console.error('Error creating income source:', error)
    return NextResponse.json(
      { error: 'Failed to create income source' },
      { status: 500 }
    )
  }
}