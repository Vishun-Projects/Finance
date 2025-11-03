const fs = require('fs');
const path = require('path');
const { renameMap } = require('./rename-to-lowercase');

// Function to recursively find all .ts, .tsx files
function findAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next') && !filePath.includes('node_modules')) {
        findAllSourceFiles(filePath, fileList);
      } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.includes('.d.ts')) {
        fileList.push(filePath);
      }
    } catch (e) {
      // Skip errors
    }
  });
  
  return fileList;
}

// Build import replacement map
const replacements = [];

Object.entries(renameMap).forEach(([oldPath, { oldName, newName, new: newPath }]) => {
  const oldRelative = oldPath.replace(/^src\//, '').replace(/\\/g, '/');
  const newRelative = newPath.replace(/^src\//, '').replace(/\\/g, '/');
  
  // Pattern: @/components/path/ComponentName
  const oldAbsolute = `@/components/${oldRelative.replace(/\.tsx$/, '')}`;
  const newAbsolute = `@/components/${newRelative.replace(/\.tsx$/, '')}`;
  replacements.push({
    pattern: new RegExp(`(['"\`])${oldAbsolute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"\`])`, 'g'),
    replacement: `$1${newAbsolute}$2`,
    description: `absolute: ${oldAbsolute}`
  });
  
  // Pattern: @/components/path/ComponentName (without extension)
  replacements.push({
    pattern: new RegExp(`(['"\`])${oldAbsolute}(['"\`])`, 'g'),
    replacement: `$1${newAbsolute}$2`,
    description: `absolute no ext: ${oldAbsolute}`
  });
  
  // Pattern for component name in various contexts
  replacements.push({
    pattern: new RegExp(`(['"\`\\./])${oldName}(['"\`\\s/])`, 'g'),
    replacement: `$1${newName}$2`,
    description: `component name: ${oldName}`
  });
  
  // Pattern: ./ComponentName or ../ComponentName
  replacements.push({
    pattern: new RegExp(`(['"\`])(\\.\\.?/)+${oldName}(['"\`])`, 'g'),
    replacement: `$1$2${newName}$3`,
    description: `relative: ${oldName}`
  });
});

console.log('Updating imports in all files...\n');

const srcFiles = findAllSourceFiles(path.resolve('src'));
let totalUpdates = 0;

srcFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    replacements.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalUpdates++;
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`✓ Updated: ${relativePath}`);
    }
  } catch (e) {
    console.error(`Error processing ${filePath}:`, e.message);
  }
});

console.log(`\n✓ Done! Updated ${totalUpdates} files.`);

