#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { performance } = require('node:perf_hooks');

console.log('Performance baseline');
console.log('======================');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    `# Performance / measurement\nNEXT_TELEMETRY_DISABLED=1\nANALYZE=false\n`,
  );
  console.log('Created .env.local with ANALYZE=false');
}

async function measureRoute(label, url) {
  const start = performance.now();
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const ms = Math.round(performance.now() - start);
    console.log(`${label}: ${ms}ms (HTTP ${res.status})`);
    return ms;
  } catch (error) {
    console.log(`${label}: failed (${error.message})`);
    return null;
  }
}

async function main() {
  const base = process.env.PERF_BASE_URL || 'http://localhost:3000';
  console.log(`\nServer timing against ${base}`);
  console.log('Start dev server first: npm run dev\n');

  await measureRoute('GET /auth', `${base}/auth`);
  await measureRoute('GET /dashboard', `${base}/dashboard`);

  console.log('\nBundle analysis: ANALYZE=true npm run build');
  console.log('Web Vitals: @vercel/speed-insights enabled in root layout (preview/prod)');
}

main();
