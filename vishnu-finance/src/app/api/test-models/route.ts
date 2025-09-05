import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  console.log('🔍 TEST MODELS - Checking available Prisma models');
  
  try {
    // Test different model names
    console.log('🔍 TEST MODELS - Testing prisma.user...');
    const userCount = await prisma.user.count();
    console.log('✅ TEST MODELS - prisma.user works, count:', userCount);

    console.log('🔍 TEST MODELS - Testing prisma.incomeSource...');
    const incomeCount = await prisma.incomeSource.count();
    console.log('✅ TEST MODELS - prisma.incomeSource works, count:', incomeCount);

    console.log('🔍 TEST MODELS - Testing prisma.expense...');
    const expenseCount = await prisma.expense.count();
    console.log('✅ TEST MODELS - prisma.expense works, count:', expenseCount);

    console.log('🔍 TEST MODELS - Testing prisma.salaryStructure...');
    const salaryCount = await prisma.salaryStructure.count();
    console.log('✅ TEST MODELS - prisma.salaryStructure works, count:', salaryCount);

    console.log('🔍 TEST MODELS - Testing prisma.goal...');
    const goalCount = await prisma.goal.count();
    console.log('✅ TEST MODELS - prisma.goal works, count:', goalCount);

    console.log('🔍 TEST MODELS - Testing prisma.wishlistItem...');
    const wishlistCount = await prisma.wishlistItem.count();
    console.log('✅ TEST MODELS - prisma.wishlistItem works, count:', wishlistCount);

    return NextResponse.json({
      success: true,
      message: 'All models are working',
      counts: {
        users: userCount,
        incomes: incomeCount,
        expenses: expenseCount,
        salaryStructures: salaryCount,
        goals: goalCount,
        wishlistItems: wishlistCount
      }
    });
  } catch (error) {
    console.error('❌ TEST MODELS - Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: JSON.stringify(error, null, 2)
    }, { status: 500 });
  }
}
