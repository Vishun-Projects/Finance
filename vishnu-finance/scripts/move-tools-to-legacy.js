/*
  Moves the repository's tools directory to legacy/tools.
  Safe to run multiple times; skips if already moved.
*/

const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function moveDir(src, dest) {
  ensureDir(path.dirname(dest));
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.renameSync(src, dest);
    return;
  }
  // Fallback: copy over, then remove src
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const sp = path.join(src, entry.name);
    const dp = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      moveDir(sp, dp);
    } else {
      ensureDir(path.dirname(dp));
      fs.copyFileSync(sp, dp);
      fs.unlinkSync(sp);
    }
  }
  fs.rmdirSync(src);
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const src = path.join(repoRoot, 'tools');
  const dest = path.join(repoRoot, 'legacy', 'tools');

  if (!fs.existsSync(src)) {
    console.log('No tools/ directory found. Nothing to move.');
    process.exit(0);
  }

  ensureDir(path.join(repoRoot, 'legacy'));
  moveDir(src, dest);
  console.log('✓ Moved tools/ -> legacy/tools/');
}

main();


