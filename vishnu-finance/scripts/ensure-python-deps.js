#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const projectRoot = path.join(__dirname, '..');
const requirementsPath = path.join(projectRoot, 'python_api', 'requirements.txt');
const pythonCmd = process.env.PYTHON || 'python';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: projectRoot,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasFastApi() {
  const check = spawnSync(pythonCmd, ['-c', 'import fastapi, uvicorn'], {
    cwd: projectRoot,
    stdio: 'ignore',
  });
  return check.status === 0;
}

if (!fs.existsSync(requirementsPath)) {
  console.error(`Missing requirements file: ${requirementsPath}`);
  process.exit(1);
}

if (hasFastApi()) {
  process.exit(0);
}

console.log('📦 Installing Python API dependencies...');
run(pythonCmd, ['-m', 'pip', 'install', '-r', requirementsPath]);

if (!hasFastApi()) {
  console.error('❌ Failed to install Python dependencies (fastapi still missing).');
  console.error(`Try manually: ${pythonCmd} -m pip install -r python_api/requirements.txt`);
  process.exit(1);
}

console.log('✅ Python API dependencies ready.');
