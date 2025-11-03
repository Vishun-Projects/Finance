const fs = require('fs');
const path = require('path');
const { renameMap, toKebabCase } = require('./rename-to-lowercase');

// Function to recursively find all .ts, .tsx files
function findAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      findAllSourceFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Perform renames (on Windows, use two-step rename for case changes)
console.log('\nRenaming files...');
Object.entries(renameMap).forEach(([oldPath, { new: newPath }]) => {
  const oldFullPath = path.resolve(oldPath);
  const newFullPath = path.resolve(newPath);
  
  if (fs.existsSync(oldFullPath)) {
    // On Windows, if case is different, need temp name
    if (oldFullPath.toLowerCase() === newFullPath.toLowerCase() && oldFullPath !== newFullPath) {
      const tempPath = oldFullPath + '.tmp';
      fs.renameSync(oldFullPath, tempPath);
      fs.renameSync(tempPath, newFullPath);
      console.log(`✓ Renamed: ${oldPath} → ${newPath}`);
    } else if (oldFullPath !== newFullPath) {
      fs.renameSync(oldFullPath, newFullPath);
      console.log(`✓ Renamed: ${oldPath} → ${newPath}`);
    }
  }
});

// Update imports in all source files
console.log('\nUpdating imports...');
const srcFiles = findAllSourceFiles(path.resolve('src'));
let totalUpdates = 0;

srcFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  Object.entries(renameMap).forEach(([oldPath, { oldName, newName, new: newPath }]) => {
    // Convert paths to relative imports
    const oldRelative = oldPath.replace(/^src\//, '');
    const newRelative = newPath.replace(/^src\//, '').replace(/\\/g, '/');
    
    // Pattern 1: @/components/... imports
    const absolutePattern = new RegExp(`@/components/${oldRelative.replace(/\\/g, '/').replace('.tsx', '')}`, 'g');
    const absoluteReplacement = `@/components/${newRelative.replace('.tsx', '')}`;
    if (content.match(absolutePattern)) {
      content = content.replace(absolutePattern, absoluteReplacement);
      updated = true;
    }
    
    // Pattern 2: Relative imports ./filename or ../filename
    const filenamePattern = new RegExp(`(['"\`])(${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(['"\`])`, 'g');
    if (filenamePattern.test(content)) {
      // Find relative path context
      const fileDir = path.dirname(filePath).replace(/\\/g, '/');
      const oldFullDir = path.dirname(oldPath).replace(/\\/g, '/');
      const newFullDir = path.dirname(newPath).replace(/\\/g, '/');
      
      // Calculate relative path from file to old component
      const oldRelativePath = path.relative(fileDir.replace(/\\/g, '/'), oldFullDir).replace(/\\/g, '/');
      const newRelativePath = path.relative(fileDir.replace(/\\/g, '/'), newFullDir).replace(/\\/g, '/');
      
      // Update relative imports
      const relativeOld = oldRelativePath ? `${oldRelativePath}/${oldName}` : oldName;
      const relativeNew = newRelativePath ? `${newRelativePath}/${newName}` : newName;
      
      // Fix for same directory
      const finalOld = relativeOld.startsWith('.') ? relativeOld : `./${relativeOld}`;
      const finalNew = relativeNew.startsWith('.') ? relativeNew : `./${relativeNew}`;
      
      content = content.replace(new RegExp(`(['"\`])${finalOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"\`])`, 'g'), `$1${finalNew}$2`);
      content = content.replace(new RegExp(`(['"\`])${relativeOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"\`])`, 'g'), `$1${relativeNew}$2`);
      updated = true;
    }
  });
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalUpdates++;
    console.log(`✓ Updated imports in: ${filePath}`);
  }
});

console.log(`\n✓ Done! Updated ${totalUpdates} files.`);

