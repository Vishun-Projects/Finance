#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bankConfigs = [
    {
        bankCode: 'HDFC_DYNAMIC',
        bankName: 'HDFC Bank (Dynamic)',
        detectionKeywords: ['HDFC BANK', 'H.D.F.C.'],
        parserType: 'PDF_TEXT',
        headerKeywords: ['DATE', 'PARTICULARS', 'DEBIT', 'CREDIT'],
        columns: {
            DATE: ['DATE', 'TXN DATE'],
            DESCRIPTION: ['PARTICULARS', 'NARRATION'],
            DEBIT: ['DEBIT', 'WITHDRAWAL'],
            CREDIT: ['CREDIT', 'DEPOSIT'],
            BALANCE: ['BALANCE', 'CLOSING']
        }
    },
    {
        bankCode: 'TEST_CUSTOM',
        bankName: 'Custom Mock Bank',
        detectionKeywords: ['MOCKBANK', 'TEST STATEMENT'],
        parserType: 'PDF_TEXT',
        headerKeywords: ['TRANSACTION_DATE', 'DETAIL', 'OUT', 'IN'],
        columns: {
            DATE: ['TRANSACTION_DATE'],
            DESCRIPTION: ['DETAIL'],
            DEBIT: ['OUT'],
            CREDIT: ['IN'],
            BALANCE: ['REMAINDER']
        }
    }
];

async function main() {
    console.log('🌱 Seeding bank parser configs...\n');

    for (const config of bankConfigs) {
        try {
            await prisma.bankParserConfig.upsert({
                where: { bankCode: config.bankCode },
                update: config,
                create: config,
            });
            console.log(`✅ Upserted: ${config.bankName} (${config.bankCode})`);
        } catch (error) {
            console.error(`❌ Error seeding ${config.bankCode}:`, error.message);
        }
    }

    console.log('\n✨ Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
