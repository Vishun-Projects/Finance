
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

async function getAllTableNames() {
    // Query to get all table names in the current database
    const result = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE()
    AND table_type = 'BASE TABLE'
  `;
    return result.map(row => row.TABLE_NAME || row.table_name);
}

async function backupTable(tableName) {
    try {
        const data = await prisma.$queryRawUnsafe(`SELECT * FROM ${tableName}`);
        return data;
    } catch (error) {
        console.error(`Error querying ${tableName}:`, error.message);
        return [];
    }
}

async function main() {
    console.log('🚀 Starting full database backup...');

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const tables = await getAllTableNames();
    console.log(`Found ${tables.length} tables to backup:`, tables.join(', '));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const manifest = {
        timestamp,
        tables: {}
    };

    for (const table of tables) {
        // Skip migrations table usually
        if (table === '_prisma_migrations') {
            // We might want to back it up just in case, but usually we don't import it directly
            // allowing Prisma to re-apply migrations on the new DB.
            // Let's back it up but mark it.
        }

        console.log(`\n📦 Backing up ${table}...`);
        const data = await backupTable(table);

        if (data.length > 0) {
            const filename = `${table}_${timestamp}.json`;
            const filePath = path.join(BACKUP_DIR, filename);
            // Handle BigInt serialization
            const json = JSON.stringify(data, (key, value) =>
                typeof value === 'bigint'
                    ? value.toString()
                    : value
                , 2);

            fs.writeFileSync(filePath, json);
            console.log(`  ✅ Saved ${data.length} rows to ${filename}`);

            manifest.tables[table] = {
                file: filename,
                count: data.length
            };
        } else {
            console.log(`  ⚠️  Table ${table} is empty. Skipping file creation.`);
            manifest.tables[table] = {
                file: null,
                count: 0
            };
        }
    }

    const manifestPath = path.join(BACKUP_DIR, `full_backup_manifest_${timestamp}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`\n🎉 Backup complete! Manifest saved to ${manifestPath}`);

    // Generating a summary report
    console.log('\n📊 Summary Report:');
    console.table(
        Object.entries(manifest.tables).map(([table, info]) => ({
            Table: table,
            Rows: info.count,
            Status: info.count > 0 ? 'Backed Up' : 'Empty'
        }))
    );

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
