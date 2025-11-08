const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTransactions() {
  try {
    const userId = 'cmez473ni0000b2nsk1vct894';
    
    console.log('🔍 Checking transactions in database...\n');
    
    // Count all transactions
    const totalCount = await prisma.transaction.count({
      where: { userId }
    });
    
    console.log(`📊 Total transactions for user: ${totalCount}`);
    
    // Count non-deleted transactions
    const activeCount = await prisma.transaction.count({
      where: { 
        userId,
        isDeleted: false
      }
    });
    
    console.log(`✅ Active (non-deleted) transactions: ${activeCount}`);
    
    // Get recent transactions
    const recent = await prisma.transaction.findMany({
      where: { 
        userId,
        isDeleted: false
      },
      orderBy: { transactionDate: 'desc' },
      take: 10,
      select: {
        id: true,
        description: true,
        creditAmount: true,
        debitAmount: true,
        transactionDate: true,
        isDeleted: true,
        createdAt: true
      }
    });
    
    console.log(`\n📋 Recent 10 transactions:`);
    recent.forEach((t, i) => {
      console.log(`${i + 1}. ${t.description?.substring(0, 40)} | ${t.transactionDate.toISOString().split('T')[0]} | Credit: ${t.creditAmount} | Debit: ${t.debitAmount} | Deleted: ${t.isDeleted}`);
    });
    
    // Check for duplicates
    const duplicates = await prisma.$queryRaw`
      SELECT 
        userId,
        description,
        creditAmount,
        debitAmount,
        transactionDate,
        isDeleted,
        COUNT(*) as count
      FROM transactions
      WHERE userId = ${userId}
      GROUP BY userId, description(255), creditAmount, debitAmount, transactionDate, isDeleted
      HAVING COUNT(*) > 1
      LIMIT 10
    `;
    
    if (duplicates.length > 0) {
      console.log(`\n⚠️ Found ${duplicates.length} potential duplicate groups`);
    } else {
      console.log(`\n✅ No duplicates found`);
    }
    
    // Check date range
    const dateRange = await prisma.transaction.aggregate({
      where: { 
        userId,
        isDeleted: false
      },
      _min: { transactionDate: true },
      _max: { transactionDate: true },
      _count: true
    });
    
    console.log(`\n📅 Date range:`);
    console.log(`   From: ${dateRange._min.transactionDate?.toISOString().split('T')[0] || 'N/A'}`);
    console.log(`   To: ${dateRange._max.transactionDate?.toISOString().split('T')[0] || 'N/A'}`);
    console.log(`   Count: ${dateRange._count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactions();



