
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const restoredUserIds = new Set();

function getLatestBackupFile(tableName) {
    if (!fs.existsSync(BACKUP_DIR)) return null;
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(`${tableName}_`) && f.endsWith('.json'));
    if (files.length === 0) return null;
    return files.sort().pop();
}

function normalizeData(item) {
    for (const key in item) {
        // Date conversion
        if (typeof item[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(item[key])) {
            item[key] = new Date(item[key]);
        }

        // Boolean conversion (MySQL 0/1 -> Boolean)
        // Heuristic: keys starting with 'is' or 'has', or known boolean fields
        if (key.startsWith('is') || key.startsWith('has')) {
            if (item[key] === 0) item[key] = false;
            if (item[key] === 1) item[key] = true;
        }

        // Handle specific fields that might be 0/1 but not start with is/has if any
        // e.g. 'active' (not used here, mostly isActive)
    }
    return item;
}

function safeJsonParse(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return { value: val };
    }
}

async function restoreTable(modelName, tableName, transformCb, filterCb) {
    const file = getLatestBackupFile(tableName);
    if (!file) {
        console.log(`⏭️  Skipping ${modelName} (no backup for ${tableName})`);
        return;
    }

    console.log(`📦 Restoring ${modelName} from ${file}...`);
    const rawData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, file), 'utf8'));

    let data = rawData.map(item => {
        item = normalizeData(item);
        if (transformCb) item = transformCb(item);
        return item;
    }).filter(item => item !== null);

    if (filterCb) {
        const originalCount = data.length;
        data = data.filter(filterCb);
        if (data.length < originalCount) {
            console.log(`  Warning: Filtered out ${originalCount - data.length} invalid/orphan rows`);
        }
    }

    if (data.length === 0) return;

    const BATCH_SIZE = 50;
    let count = 0;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        try {
            await prisma[modelName].createMany({
                data: batch,
                skipDuplicates: true
            });
            count += batch.length;
        } catch (error) {
            console.error(`❌ Error inserting batch for ${modelName}:`, error.message);
            // Fallback sequential
            if (batch.length < 20) {
                for (const item of batch) {
                    try { await prisma[modelName].create({ data: item }); count++; }
                    catch (e) { /* ignore duplicate or error */ }
                }
            }
        }
    }
    console.log(`  ✅ Inserted ${count}/${data.length} rows into ${modelName}`);
}

async function main() {
    console.log('🚀 Starting restoration to Supabase (v2 with Boolean Fixes)...');

    // 1. Users
    await restoreTable('user', 'users', (item) => {
        return item; // normalizeData handles booleans
    });

    // Fetch restored user IDs to filter disjoint data later
    const users = await prisma.user.findMany({ select: { id: true } });
    users.forEach(u => restoredUserIds.add(u.id));
    console.log(`ℹ️  Found ${restoredUserIds.size} users for validation.`);

    // 2. GlobalDesignSettings
    await restoreTable('globalDesignSettings', 'global_design_settings');

    // 3. UserPreferences
    await restoreTable('userPreferences', 'user_preferences', null, (item) => referencedUserExists(item.userId));

    // 4. Categories
    const catFile = getLatestBackupFile('categories');
    if (catFile) {
        console.log(`📦 Restoring categories...`);
        let cats = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, catFile), 'utf8'));
        cats = cats.map(normalizeData).filter(c => referencedUserExists(c.userId));

        const roots = cats.filter(c => !c.parentCategoryId);
        const children = cats.filter(c => c.parentCategoryId);

        try {
            await prisma.category.createMany({ data: roots, skipDuplicates: true });
            await prisma.category.createMany({ data: children, skipDuplicates: true });
            console.log(`  ✅ Inserted categories (${roots.length} roots, ${children.length} children)`);
        } catch (e) { console.error(`❌ Error restoring categories: ${e.message}`); }
    }

    // 5. SuperDocuments
    await restoreTable('superDocument', 'super_documents', null, (item) => referencedUserExists(item.uploadedById));

    // 6. Documents
    await restoreTable('document', 'documents', (item) => {
        if (item.metadata && typeof item.metadata === 'string') item.metadata = safeJsonParse(item.metadata);
        return item;
    }, (item) => referencedUserExists(item.uploadedById));

    // 7. AdvisorConversation
    await restoreTable('advisorConversation', 'advisor_conversations', null, (item) => referencedUserExists(item.userId));

    // 8. AdvisorMessage
    await restoreTable('advisorMessage', 'advisor_messages', (item) => {
        if (item.sources && typeof item.sources === 'string') item.sources = safeJsonParse(item.sources);
        return item;
    });

    // 9. Goals
    await restoreTable('goal', 'goals', null, (item) => referencedUserExists(item.userId));

    // 10. SalaryStructure
    await restoreTable('salaryStructure', 'salary_structures', null, (item) => referencedUserExists(item.userId));

    // 11. SalaryHistory
    await restoreTable('salaryHistory', 'salary_history', null, (item) => referencedUserExists(item.userId));

    // 12. Deadlines
    await restoreTable('deadline', 'deadlines', null, (item) => referencedUserExists(item.userId));

    // 13. Transactions
    await restoreTable('transaction', 'transactions', (item) => {
        delete item.accountStatementId;
        if (item.rawData && typeof item.rawData === 'string') item.rawData = safeJsonParse(item.rawData);
        if (item.rawParsingData && typeof item.rawParsingData === 'string') item.rawParsingData = safeJsonParse(item.rawParsingData);
        return item;
    }, (item) => referencedUserExists(item.userId));

    // 14. AuditLog
    await restoreTable('auditLog', 'audit_logs', (item) => {
        if (item.metadata && typeof item.metadata === 'string') item.metadata = safeJsonParse(item.metadata);
        return item;
    }, (item) => referencedUserExists(item.actorId));

    // 15. WishlistItems
    await restoreTable('wishlistItem', 'wishlist_items', null, (item) => referencedUserExists(item.userId));

    console.log('\n🎉 Restoration complete!');
    await prisma.$disconnect();
}

function referencedUserExists(userId) {
    if (!userId) return true; // nullable assumed ok unless schema strict, schema usually strict for userId
    return restoredUserIds.has(userId);
}

main().catch(e => {
    console.error('Fatal Error:', e);
    process.exit(1);
});
