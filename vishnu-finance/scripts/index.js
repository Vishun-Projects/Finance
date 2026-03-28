#!/usr/bin/env node

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const mysql = require('mysql2/promise');

const projectRoot = path.join(__dirname, '..');

function logSection(title) {
  console.log('\n' + '─'.repeat(60));
  console.log(title);
  console.log('─'.repeat(60));
}

function parseDatabaseUrl(url) {
  if (!url) {
    throw new Error('DATABASE_URL is not defined. Please set it in your environment.');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error(`Unable to parse DATABASE_URL "${url}": ${error.message}`);
  }

  if (parsed.protocol !== 'mysql:' && parsed.protocol !== 'postgresql:') {
    throw new Error(`Unsupported protocol "${parsed.protocol}". Expected mysql:// or postgresql:// connection string.`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database) {
    throw new Error('DATABASE_URL must include a database name (mysql://user:pass@host:port/database).');
  }

  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}

async function ensureDatabaseExists(connectionConfig, protocol) {
  if (protocol === 'postgresql:') {
    logSection('🔍 PostgreSQL detected - skipping raw existence check (Prisma will handle it)');
    return;
  }
  logSection('🔍 Checking database');

  const { host, port, user, password, database } = connectionConfig;
  const baseConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    const [rows] = await baseConnection.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [database],
    );

    if (rows.length === 0) {
      console.log(`🆕 Database "${database}" not found. Creating...`);
      await baseConnection.query(
        `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      console.log(`✅ Database "${database}" created.`);
    } else {
      console.log(`✅ Database "${database}" already exists.`);
    }
  } finally {
    await baseConnection.end();
  }
}

function runCommand(command, options = {}) {
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: projectRoot,
      env: process.env,
      ...options,
    });
    return true;
  } catch (error) {
    if (error.stdout) {
      process.stdout.write(error.stdout.toString());
    }
    if (error.stderr) {
      process.stderr.write(error.stderr.toString());
    }
    return false;
  }
}

async function applyMigrations() {
  logSection('⏩ Applying Prisma migrations');

  const migrated = runCommand('npx prisma migrate deploy');
  if (!migrated) {
    console.warn('⚠️  prisma migrate deploy failed (DB may be unreachable). Attempting db push...');
    const pushed = runCommand('npx prisma db push --accept-data-loss');
    if (!pushed) {
      console.warn('⚠️  prisma db push also failed. Skipping schema sync – app will use existing schema.');
      // Non-fatal: dev server can still start even if migrations didn't run
    }
  }

  // Skip prisma generate if the engine binary already exists (avoids EPERM on Windows when
  // a previous dev server still has the DLL locked).
  const enginePath = path.join(
    projectRoot,
    'node_modules/.prisma/client/query_engine-windows.dll.node'
  );
  if (fs.existsSync(enginePath)) {
    console.log('\n⚡ Prisma client already generated – skipping regeneration.');
    return;
  }

  console.log('\n🔄 Generating Prisma client...');
  const generated = runCommand('npx prisma generate');
  if (!generated) {
    // Non-fatal on Windows – client may already be usable even if rename failed
    console.warn('⚠️  prisma generate failed (likely file-lock on Windows). App may still work.');
  }
}

function captureDiffSql() {
  try {
    const buffer = execSync(
      'npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script',
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    return buffer.toString();
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : '';
    const stderr = error.stderr ? error.stderr.toString() : '';

    if (/No changes were found/.test(stdout) || /No changes were found/.test(stderr)) {
      return '';
    }

    if (/No changes were detected/.test(stdout) || /No changes were detected/.test(stderr)) {
      return '';
    }

    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }

    throw new Error('Failed to diff schema using Prisma.');
  }
}

function splitSqlStatements(sql) {
  if (!sql.trim()) {
    return [];
  }

  const statements = [];
  let current = '';
  let inStatement = false;

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith('--')) {
      continue;
    }
    if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
      continue;
    }

    if (trimmed.length > 0) {
      inStatement = true;
    }

    current += (current ? '\n' : '') + line;

    if (trimmed.endsWith(';')) {
      if (inStatement) {
        statements.push(current.trim());
      }
      current = '';
      inStatement = false;
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

function classifyStatements(statements) {
  const safe = [];
  const skipped = [];

  for (const statement of statements) {
    const normalized = statement.replace(/\s+/g, ' ').toUpperCase();

    const isDrop =
      normalized.includes('DROP TABLE') ||
      normalized.includes('DROP COLUMN') ||
      normalized.includes('DROP INDEX');
    const isDestructive =
      normalized.includes('ALTER TABLE') &&
      (normalized.includes(' DROP ') ||
        normalized.includes(' RENAME COLUMN ') ||
        normalized.includes(' MODIFY ') ||
        normalized.includes(' CHANGE '));

    if (isDrop || isDestructive) {
      skipped.push(statement);
      continue;
    }

    if (normalized.startsWith('START TRANSACTION') || normalized.startsWith('COMMIT')) {
      continue;
    }

    safe.push(statement);
  }

  return { safe, skipped };
}

async function applySafeDiffStatements(connectionConfig, statements) {
  if (statements.length === 0) {
    return;
  }

  const connection = await mysql.createConnection({
    host: connectionConfig.host,
    port: connectionConfig.port,
    user: connectionConfig.user,
    password: connectionConfig.password,
    database: connectionConfig.database,
    multipleStatements: false,
  });

  try {
    for (const statement of statements) {
      console.log(`➡️  ${statement}`);
      await connection.query(statement);
    }
  } finally {
    await connection.end();
  }
}

async function ensureColumns(connectionConfig) {
  logSection('🧩 Verifying column differences');

  const diffSql = captureDiffSql();
  if (!diffSql.trim()) {
    console.log('✅ Database schema matches prisma/schema.prisma.');
    return;
  }

  const statements = splitSqlStatements(diffSql);
  const { safe, skipped } = classifyStatements(statements);

  if (safe.length === 0 && skipped.length === 0) {
    console.log('✅ No actionable schema differences detected.');
    return;
  }

  if (safe.length > 0) {
    console.log(`🔧 Applying ${safe.length} non-destructive schema updates...`);
    await applySafeDiffStatements(connectionConfig, safe);
    console.log('✅ Non-destructive schema updates applied.');
  }

  if (skipped.length > 0) {
    console.warn('\n⚠️  Some schema changes were detected but not applied automatically (potentially destructive):');
    skipped.forEach((statement, index) => {
      console.warn(`\n[${index + 1}] ${statement}`);
    });
    console.warn('\nPlease review these statements and apply them manually using a migration.');
  }
}

function discoverSeederScripts() {
  const scriptDir = __dirname;
  const defaultSeeders = new Set();

  const setupPath = path.join(scriptDir, 'setup.js');
  if (fs.existsSync(setupPath)) {
    defaultSeeders.add(setupPath);
  }

  const files = fs.readdirSync(scriptDir);
  for (const file of files) {
    if (/^seed-.*\.js$/i.test(file)) {
      defaultSeeders.add(path.join(scriptDir, file));
    }
  }

  return Array.from(defaultSeeders);
}

function runSeeder(scriptPath) {
  const relative = path.relative(projectRoot, scriptPath);
  console.log(`\n🌱 Running seeder: ${relative}`);

  const success = runCommand(`node ${JSON.stringify(relative)}`);
  if (!success) {
    throw new Error(`Seeder "${relative}" failed.`);
  }
}

async function runSeeders() {
  logSection('🌱 Seeding data');

  const seeders = discoverSeederScripts();
  if (seeders.length === 0) {
    console.log('ℹ️  No seeder scripts found in scripts directory.');
    return;
  }

  for (const seeder of seeders) {
    runSeeder(seeder);
  }

  console.log('\n✅ Seeders completed.');
}

function loadEnvFiles() {
  const envFiles = ['.env', '.env.local'];

  try {
    const dotenv = require('dotenv');
    for (const file of envFiles) {
      const fullPath = path.join(projectRoot, file);
      if (fs.existsSync(fullPath)) {
        dotenv.config({ path: fullPath });
      }
    }
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
    // dotenv not installed; skip silently
  }
}

async function main() {
  console.log('🚀 Vishnu Finance bootstrap starting...');

  loadEnvFiles();

  const url = process.env.DATABASE_URL;
  const protocol = new URL(url).protocol;
  const connectionConfig = protocol === 'mysql:' ? parseDatabaseUrl(url) : null;

  await ensureDatabaseExists(connectionConfig, protocol);
  await applyMigrations();

  if (protocol === 'mysql:') {
    await ensureColumns(connectionConfig);
  } else {
    logSection('🧩 PostgreSQL detected - skipping raw column verification');
  }

  // GIVE DB A MOMENT TO BREATHE
  console.log('\n⏳ Waiting 3s for database connections to settle...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await runSeeders();

  console.log('\n🎉 Database is ready!');
}

main().catch((error) => {
  console.error('\n❌ Bootstrap failed:', error.message);
  process.exitCode = 1;
});


