const fs = require('fs');
const path = require('path');

// Convert PascalCase to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// Get all component files that need renaming
const filesToRename = [
  'src/components/assistants/AIFinancialAssistant.tsx',
  'src/components/assistants/AuthWrapper.tsx',
  'src/components/assistants/CurrencyDisplay.tsx',
  'src/components/assistants/ProtectedRoute.tsx',
  'src/components/assistants/TutorialGuide.tsx',
  'src/components/assistants/UserValidation.tsx',
  'src/components/AuthWrapper.tsx',
  'src/components/dashboard/SimpleDashboard.tsx',
  'src/components/DeadlinesManagement.tsx',
  'src/components/education/FinancialEducation.tsx',
  'src/components/ExpenseManagement.tsx',
  'src/components/feedback/ErrorBoundary.tsx',
  'src/components/feedback/GlobalPreloader.tsx',
  'src/components/feedback/LoadingSpinner.tsx',
  'src/components/feedback/PageSkeleton.tsx',
  'src/components/GoalsManagement.tsx',
  'src/components/IncomeManagement.tsx',
  'src/components/layout/ContentWrapper.tsx',
  'src/components/layout/ModernCard.tsx',
  'src/components/layout/ModernGrid.tsx',
  'src/components/layout/ModernPageLayout.tsx',
  'src/components/layout/Navigation.tsx',
  'src/components/management/DeadlinesManagement.tsx',
  'src/components/management/ExpenseManagement.tsx',
  'src/components/management/GoalsManagement.tsx',
  'src/components/management/IncomeManagement.tsx',
  'src/components/management/SalaryStructureManagement.tsx',
  'src/components/management/WishlistManagement.tsx',
  'src/components/ModernCard.tsx',
  'src/components/ModernGrid.tsx',
  'src/components/ModernPageLayout.tsx',
  'src/components/PageSkeleton.tsx',
  'src/components/SalaryStructureManagement.tsx',
  'src/components/SimpleDashboard.tsx',
  'src/components/UserValidation.tsx',
  'src/components/WishlistManagement.tsx',
];

const renameMap = {};

filesToRename.forEach(filePath => {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath, '.tsx');
  const newFilename = toKebabCase(filename) + '.tsx';
  const newPath = path.join(dir, newFilename);
  
  renameMap[filePath] = {
    old: filePath,
    new: newPath,
    oldName: filename,
    newName: toKebabCase(filename)
  };
});

console.log('Files to rename:');
Object.entries(renameMap).forEach(([old, { new: newPath }]) => {
  console.log(`  ${old} → ${newPath}`);
});

// Export for use in other scripts
module.exports = { renameMap, toKebabCase };

