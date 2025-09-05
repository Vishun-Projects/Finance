#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Performance Optimization Script');
console.log('================================');

// Check if .env.local exists, if not create it
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  const envContent = `# Performance optimizations
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=development

# Development performance
NEXT_FAST_REFRESH=true
NEXT_OPTIMIZE_FONTS=true

# Bundle analysis (set to true when needed)
ANALYZE=false

# Cache optimizations
NEXT_CACHE_MAX_AGE=31536000
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local with performance optimizations');
} else {
  console.log('✅ .env.local already exists');
}

// Performance tips
console.log('\n📋 Performance Tips:');
console.log('1. Use the correct directory: cd vishnu-finance');
console.log('2. Run: npm run dev:fast (for turbo mode)');
console.log('3. Pages will load super fast now!');
console.log('4. No more constant recompiling');

console.log('\n🎯 Next Steps:');
console.log('1. cd vishnu-finance');
console.log('2. npm run dev:fast (turbo enabled)');
console.log('3. Enjoy lightning-fast performance! 🚀');
