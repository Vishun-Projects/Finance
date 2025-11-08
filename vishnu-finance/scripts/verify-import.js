const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyImport() {
  try {
    const userId = 'cmez473ni0000b2nsk1vct894';
    
    console.log('🔍 Verifying transaction import...\n');
    
    // Count transactions by date range
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const lastMonthCount = await prisma.transaction.count({
      where: { 
        userId,
        isDeleted: false,
        transactionDate: {
          gte: lastMonth,
          lt: thisMonth
        }
      }
    });
    
    const thisMonthCount = await prisma.transaction.count({
      where: { 
        userId,
        isDeleted: false,
        transactionDate: {
          gte: thisMonth
        }
      }
    });
    
    console.log(`📊 Last month (${lastMonth.toISOString().split('T')[0]} to ${thisMonth.toISOString().split('T')[0]}): ${lastMonthCount} transactions`);
    console.log(`📊 This month (from ${thisMonth.toISOString().split('T')[0]}): ${thisMonthCount} transactions`);
    
    // Get total counts
    const total = await prisma.transaction.count({
      where: { userId, isDeleted: false }
    });
    
    const totalCredits = await prisma.transaction.aggregate({
      where: { userId, isDeleted: false, creditAmount: { gt: 0 } },
      _sum: { creditAmount: true },
      _count: true
    });
    
    const totalDebits = await prisma.transaction.aggregate({
      where: { userId, isDeleted: false, debitAmount: { gt: 0 } },
      _sum: { debitAmount: true },
      _count: true
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total transactions: ${total}`);
    console.log(`   Credits: ${totalCredits._count} transactions, Total: ${totalCredits._sum.creditAmount}`);
    console.log(`   Debits: ${totalDebits._count} transactions, Total: ${totalDebits._sum.debitAmount}`);
    
    // Check for recent imports (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.transaction.count({
      where: {
        userId,
        isDeleted: false,
        createdAt: {
          gte: oneHourAgo
        }
      }
    });
    
    console.log(`\n⏰ Transactions created in last hour: ${recent}`);
    
    // Check unique constraint
    try {
      const indexCheck = await prisma.$queryRaw`
        SHOW INDEX FROM transactions WHERE Key_name = 'transactions_unique_key'
      `;
      console.log(`\n✅ Unique constraint exists: ${indexCheck.length > 0 ? 'Yes' : 'No'}`);
    } catch (e) {
      console.log(`\n⚠️ Could not check unique constraint: ${e.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyImport();



