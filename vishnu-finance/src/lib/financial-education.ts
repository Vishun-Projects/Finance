// Comprehensive financial education system for users with no finance background
export interface FinancialTip {
  id: string;
  category: 'budgeting' | 'saving' | 'investing' | 'debt' | 'insurance' | 'tax' | 'emergency' | 'retirement';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeframe: string;
  actionable: boolean;
  steps?: string[];
  warning?: string;
  benefit?: string;
  example?: string;
  relatedTerms?: string[];
}

export interface FinancialConcept {
  term: string;
  definition: string;
  importance: string;
  example: string;
  relatedTerms: string[];
  category: string;
}

export interface FinancialScenario {
  id: string;
  title: string;
  description: string;
  options: Array<{
    choice: string;
    outcome: string;
    impact: 'positive' | 'negative' | 'neutral';
    explanation: string;
  }>;
  correctChoice: number;
  learning: string;
}

// Financial education tips database
export const financialTips: FinancialTip[] = [
  // Budgeting Tips
  {
    id: 'budget-001',
    category: 'budgeting',
    title: 'Follow the 50-30-20 Rule',
    description: 'Allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: 'Immediate',
    actionable: true,
    steps: [
      'Calculate your monthly take-home income',
      'List all your essential expenses (rent, food, utilities)',
      'Allocate 50% of income to these needs',
      'Set aside 30% for wants (entertainment, dining out)',
      'Use remaining 20% for savings and debt payments'
    ],
    benefit: 'Creates a balanced financial foundation',
    example: 'If you earn ₹50,000/month: ₹25,000 for needs, ₹15,000 for wants, ₹10,000 for savings/debt'
  },
  {
    id: 'budget-002',
    category: 'budgeting',
    title: 'Track Every Expense for 30 Days',
    description: 'Record every single expense for a month to understand your spending patterns.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: '30 days',
    actionable: true,
    steps: [
      'Download a expense tracking app or use a notebook',
      'Record every expense immediately after making it',
      'Categorize expenses (food, transport, entertainment)',
      'Review weekly to identify patterns',
      'Adjust budget based on actual spending'
    ],
    benefit: 'Reveals hidden spending habits and helps create realistic budgets',
    warning: 'Be honest and don\'t skip small expenses - they add up quickly'
  },

  // Saving Tips
  {
    id: 'save-001',
    category: 'saving',
    title: 'Pay Yourself First',
    description: 'Transfer money to savings immediately when you receive your salary, before spending on anything else.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: 'Immediate',
    actionable: true,
    steps: [
      'Set up automatic transfer from salary account to savings',
      'Transfer 10-20% of salary on payday',
      'Treat savings like a fixed expense',
      'Increase percentage gradually over time'
    ],
    benefit: 'Ensures consistent savings and prevents overspending',
    example: 'If you earn ₹40,000, automatically save ₹4,000-8,000 first'
  },
  {
    id: 'save-002',
    category: 'saving',
    title: 'Build an Emergency Fund',
    description: 'Save 3-6 months of expenses in a separate account for unexpected situations.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: '6-12 months',
    actionable: true,
    steps: [
      'Calculate your monthly essential expenses',
      'Multiply by 3-6 months (start with 3)',
      'Open a separate high-yield savings account',
      'Set up automatic monthly transfers',
      'Don\'t touch this money except for true emergencies'
    ],
    benefit: 'Provides financial security during job loss, medical emergencies, or unexpected expenses',
    warning: 'Only use for genuine emergencies, not for wants or planned expenses'
  },

  // Debt Management
  {
    id: 'debt-001',
    category: 'debt',
    title: 'Use the Debt Snowball Method',
    description: 'Pay minimum on all debts, then put extra money toward the smallest debt first.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: 'Varies by debt amount',
    actionable: true,
    steps: [
      'List all debts from smallest to largest balance',
      'Pay minimum payments on all debts',
      'Put any extra money toward the smallest debt',
      'Once smallest debt is paid, move to next smallest',
      'Continue until all debts are paid'
    ],
    benefit: 'Provides psychological motivation and quick wins',
    example: 'If you have ₹5,000 credit card debt and ₹50,000 personal loan, pay off credit card first'
  },
  {
    id: 'debt-002',
    category: 'debt',
    title: 'Avoid High-Interest Debt',
    description: 'Never take loans with interest rates above 15% unless absolutely necessary.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: 'Immediate',
    actionable: true,
    steps: [
      'Compare interest rates before taking any loan',
      'Avoid payday loans and high-interest credit cards',
      'Consider alternatives like personal loans from banks',
      'Negotiate lower rates with existing creditors',
      'Pay off high-interest debt as quickly as possible'
    ],
    benefit: 'Saves thousands in interest payments over time',
    warning: 'High-interest debt can quickly spiral out of control'
  },

  // Investment Basics
  {
    id: 'invest-001',
    category: 'investing',
    title: 'Start with SIPs (Systematic Investment Plans)',
    description: 'Invest small amounts regularly in mutual funds to build wealth over time.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: 'Long-term (5+ years)',
    actionable: true,
    steps: [
      'Choose a reputable mutual fund house',
      'Start with ₹500-1000 per month',
      'Select equity funds for long-term growth',
      'Set up automatic monthly deductions',
      'Increase amount as income grows'
    ],
    benefit: 'Builds wealth through compound interest and rupee cost averaging',
    example: 'Investing ₹1,000/month for 20 years at 12% returns = ₹9.9 lakhs'
  },
  {
    id: 'invest-002',
    category: 'investing',
    title: 'Understand Risk vs Return',
    description: 'Higher potential returns come with higher risk. Match your investments to your risk tolerance.',
    impact: 'medium',
    difficulty: 'intermediate',
    timeframe: 'Ongoing',
    actionable: true,
    steps: [
      'Assess your risk tolerance (conservative, moderate, aggressive)',
      'Choose investments that match your risk profile',
      'Diversify across different asset classes',
      'Review and rebalance portfolio annually',
      'Don\'t panic during market downturns'
    ],
    benefit: 'Helps make informed investment decisions and avoid costly mistakes',
    warning: 'Never invest money you can\'t afford to lose'
  },

  // Tax Planning
  {
    id: 'tax-001',
    category: 'tax',
    title: 'Maximize Tax-Saving Investments',
    description: 'Invest in tax-saving instruments under Section 80C to reduce your tax liability.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: 'Before March 31st each year',
    actionable: true,
    steps: [
      'Calculate your tax liability for the year',
      'Invest up to ₹1.5 lakhs in 80C instruments',
      'Consider ELSS mutual funds for better returns',
      'Don\'t wait until March - invest throughout the year',
      'Keep proper documentation for tax filing'
    ],
    benefit: 'Reduces tax burden while building wealth',
    example: 'If you\'re in 30% tax bracket, saving ₹1.5 lakhs saves ₹45,000 in taxes'
  },

  // Insurance
  {
    id: 'insurance-001',
    category: 'insurance',
    title: 'Get Adequate Life Insurance',
    description: 'Buy term life insurance worth 10-15 times your annual income.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: 'Immediate',
    actionable: true,
    steps: [
      'Calculate your family\'s financial needs',
      'Multiply annual income by 10-15',
      'Buy pure term insurance (not investment plans)',
      'Compare quotes from multiple insurers',
      'Review coverage every 5 years'
    ],
    benefit: 'Protects your family\'s financial future',
    warning: 'Avoid insurance-cum-investment plans - buy term and invest separately'
  },

  // Emergency Planning
  {
    id: 'emergency-001',
    category: 'emergency',
    title: 'Prepare for Medical Emergencies',
    description: 'Have health insurance and medical emergency fund to handle unexpected health issues.',
    impact: 'high',
    difficulty: 'beginner',
    timeframe: 'Immediate',
    actionable: true,
    steps: [
      'Buy comprehensive health insurance for family',
      'Keep ₹50,000-1,00,000 in medical emergency fund',
      'Maintain list of emergency contacts',
      'Keep important documents easily accessible',
      'Review insurance coverage annually'
    ],
    benefit: 'Prevents medical emergencies from becoming financial disasters',
    warning: 'Medical costs can quickly deplete savings without proper insurance'
  }
];

// Financial concepts dictionary
export const financialConcepts: FinancialConcept[] = [
  {
    term: 'Compound Interest',
    definition: 'Interest calculated on the initial principal and accumulated interest from previous periods.',
    importance: 'The most powerful force in building wealth over time.',
    example: 'If you invest ₹10,000 at 10% annual return, after 10 years you\'ll have ₹25,937 (not just ₹20,000).',
    relatedTerms: ['Simple Interest', 'SIP', 'Mutual Funds'],
    category: 'investing'
  },
  {
    term: 'Emergency Fund',
    definition: 'Money set aside to cover unexpected expenses or financial emergencies.',
    importance: 'Prevents you from going into debt during unexpected situations.',
    example: 'If you lose your job, an emergency fund covers 3-6 months of expenses while you find new work.',
    relatedTerms: ['Liquid Assets', 'High-Yield Savings', 'Financial Security'],
    category: 'saving'
  },
  {
    term: 'Asset Allocation',
    definition: 'The process of dividing investments among different asset categories like stocks, bonds, and cash.',
    importance: 'Helps balance risk and return based on your goals and risk tolerance.',
    example: 'A 30-year-old might allocate 70% to stocks, 20% to bonds, and 10% to cash.',
    relatedTerms: ['Diversification', 'Risk Management', 'Portfolio'],
    category: 'investing'
  },
  {
    term: 'Credit Score',
    definition: 'A numerical representation of your creditworthiness based on your credit history.',
    importance: 'Affects your ability to get loans, credit cards, and favorable interest rates.',
    example: 'A score above 750 is considered excellent and gets you the best loan rates.',
    relatedTerms: ['CIBIL', 'Credit Report', 'Credit History'],
    category: 'debt'
  },
  {
    term: 'Inflation',
    definition: 'The rate at which prices for goods and services increase over time.',
    importance: 'Reduces the purchasing power of money, making it crucial to invest for growth.',
    example: 'If inflation is 6% and your savings earn 4%, you\'re actually losing 2% purchasing power.',
    relatedTerms: ['Purchasing Power', 'Real Returns', 'Cost of Living'],
    category: 'general'
  }
];

// Financial scenarios for learning
export const financialScenarios: FinancialScenario[] = [
  {
    id: 'scenario-001',
    title: 'Salary Increase Decision',
    description: 'You received a ₹10,000 salary increase. How should you allocate this extra money?',
    options: [
      {
        choice: 'Spend it all on wants and entertainment',
        outcome: 'Immediate gratification but no long-term benefit',
        impact: 'negative',
        explanation: 'This approach doesn\'t build wealth or financial security.'
      },
      {
        choice: 'Save 50% and spend 50%',
        outcome: 'Balanced approach with some savings',
        impact: 'neutral',
        explanation: 'Good balance but could be more aggressive with savings.'
      },
      {
        choice: 'Save 70%, invest 20%, spend 10%',
        outcome: 'Builds wealth while allowing small reward',
        impact: 'positive',
        explanation: 'Maximizes long-term wealth building while providing motivation.'
      }
    ],
    correctChoice: 2,
    learning: 'Always prioritize savings and investments when income increases. The 70-20-10 rule (save-invest-spend) is ideal for salary increases.'
  },
  {
    id: 'scenario-002',
    title: 'Emergency Fund vs Investment',
    description: 'You have ₹50,000 extra. Should you invest it or add to emergency fund?',
    options: [
      {
        choice: 'Invest all in mutual funds for higher returns',
        outcome: 'Higher potential returns but no safety net',
        impact: 'negative',
        explanation: 'Without emergency fund, you might need to withdraw investments during emergencies at a loss.'
      },
      {
        choice: 'Add all to emergency fund',
        outcome: 'Safe but low returns',
        impact: 'neutral',
        explanation: 'Safe approach but might be too conservative if you already have adequate emergency fund.'
      },
      {
        choice: 'Check emergency fund first, then invest excess',
        outcome: 'Balanced approach with proper safety net',
        impact: 'positive',
        explanation: 'Ensure 3-6 months expenses in emergency fund, then invest the rest for growth.'
      }
    ],
    correctChoice: 2,
    learning: 'Always prioritize emergency fund before investments. Once you have 3-6 months expenses saved, invest the rest.'
  }
];

// Financial education service
export class FinancialEducationService {
  // Get tips by category
  static getTipsByCategory(category: FinancialTip['category']): FinancialTip[] {
    return financialTips.filter(tip => tip.category === category);
  }

  // Get tips by difficulty
  static getTipsByDifficulty(difficulty: FinancialTip['difficulty']): FinancialTip[] {
    return financialTips.filter(tip => tip.difficulty === difficulty);
  }

  // Get actionable tips only
  static getActionableTips(): FinancialTip[] {
    return financialTips.filter(tip => tip.actionable);
  }

  // Get high-impact tips
  static getHighImpactTips(): FinancialTip[] {
    return financialTips.filter(tip => tip.impact === 'high');
  }

  // Get random tip
  static getRandomTip(): FinancialTip {
    const randomIndex = Math.floor(Math.random() * financialTips.length);
    return financialTips[randomIndex];
  }

  // Get tip of the day
  static getTipOfTheDay(): FinancialTip {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const tipIndex = dayOfYear % financialTips.length;
    return financialTips[tipIndex];
  }

  // Search tips
  static searchTips(query: string): FinancialTip[] {
    const lowercaseQuery = query.toLowerCase();
    return financialTips.filter(tip => 
      tip.title.toLowerCase().includes(lowercaseQuery) ||
      tip.description.toLowerCase().includes(lowercaseQuery) ||
      tip.steps?.some(step => step.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Get financial concept
  static getFinancialConcept(term: string): FinancialConcept | undefined {
    return financialConcepts.find(concept => 
      concept.term.toLowerCase() === term.toLowerCase()
    );
  }

  // Search concepts
  static searchConcepts(query: string): FinancialConcept[] {
    const lowercaseQuery = query.toLowerCase();
    return financialConcepts.filter(concept =>
      concept.term.toLowerCase().includes(lowercaseQuery) ||
      concept.definition.toLowerCase().includes(lowercaseQuery) ||
      concept.relatedTerms.some(term => term.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Get random scenario
  static getRandomScenario(): FinancialScenario {
    const randomIndex = Math.floor(Math.random() * financialScenarios.length);
    return financialScenarios[randomIndex];
  }

  // Get personalized recommendations
  static getPersonalizedRecommendations(userProfile: {
    age: number;
    income: number;
    expenses: number;
    savings: number;
    debt: number;
    experience: 'beginner' | 'intermediate' | 'advanced';
  }): FinancialTip[] {
    let recommendations: FinancialTip[] = [];

    // Based on experience level
    if (userProfile.experience === 'beginner') {
      recommendations = recommendations.concat(
        this.getTipsByDifficulty('beginner')
      );
    }

    // Based on savings rate
    const savingsRate = (userProfile.savings / userProfile.income) * 100;
    if (savingsRate < 10) {
      recommendations = recommendations.concat(
        this.getTipsByCategory('saving')
      );
    }

    // Based on debt level
    if (userProfile.debt > 0) {
      recommendations = recommendations.concat(
        this.getTipsByCategory('debt')
      );
    }

    // Based on age
    if (userProfile.age < 30) {
      recommendations = recommendations.concat(
        this.getTipsByCategory('investing')
      );
    }

    // Remove duplicates and return top 5
    const uniqueRecommendations = recommendations.filter((tip, index, self) =>
      index === self.findIndex(t => t.id === tip.id)
    );

    return uniqueRecommendations.slice(0, 5);
  }

  // Get financial health assessment
  static assessFinancialHealth(userProfile: {
    income: number;
    expenses: number;
    savings: number;
    debt: number;
    emergencyFund: number;
    age: number;
  }): {
    score: number;
    category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
  } {
    let score = 0;
    const recommendations: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Savings rate (30 points)
    const savingsRate = (userProfile.savings / userProfile.income) * 100;
    if (savingsRate >= 20) {
      score += 30;
      strengths.push('Excellent savings rate');
    } else if (savingsRate >= 10) {
      score += 20;
      strengths.push('Good savings rate');
    } else if (savingsRate >= 5) {
      score += 10;
      weaknesses.push('Low savings rate');
      recommendations.push('Increase your savings rate to at least 10% of income');
    } else {
      weaknesses.push('Very low savings rate');
      recommendations.push('Start saving immediately - even 5% is better than nothing');
    }

    // Emergency fund (25 points)
    const monthlyExpenses = userProfile.expenses / 12;
    const emergencyFundMonths = userProfile.emergencyFund / monthlyExpenses;
    if (emergencyFundMonths >= 6) {
      score += 25;
      strengths.push('Adequate emergency fund');
    } else if (emergencyFundMonths >= 3) {
      score += 15;
      strengths.push('Basic emergency fund');
    } else {
      score += 5;
      weaknesses.push('Insufficient emergency fund');
      recommendations.push('Build emergency fund covering 3-6 months of expenses');
    }

    // Debt-to-income ratio (25 points)
    const debtToIncome = (userProfile.debt / userProfile.income) * 100;
    if (debtToIncome <= 20) {
      score += 25;
      strengths.push('Low debt burden');
    } else if (debtToIncome <= 40) {
      score += 15;
      strengths.push('Manageable debt level');
    } else if (debtToIncome <= 60) {
      score += 5;
      weaknesses.push('High debt burden');
      recommendations.push('Focus on reducing debt before taking new loans');
    } else {
      weaknesses.push('Very high debt burden');
      recommendations.push('Seek professional debt counseling immediately');
    }

    // Age-appropriate investments (20 points)
    const recommendedInvestment = userProfile.age < 30 ? 10 : userProfile.age < 50 ? 15 : 20;
    if (userProfile.savings >= (userProfile.income * recommendedInvestment / 100)) {
      score += 20;
      strengths.push('Age-appropriate investment level');
    } else {
      score += 10;
      weaknesses.push('Below recommended investment level');
      recommendations.push(`Increase investments to ${recommendedInvestment}% of income for your age`);
    }

    // Determine category
    let category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (score >= 90) category = 'excellent';
    else if (score >= 75) category = 'good';
    else if (score >= 60) category = 'fair';
    else if (score >= 40) category = 'poor';
    else category = 'critical';

    return {
      score,
      category,
      recommendations,
      strengths,
      weaknesses
    };
  }
}

// Export the service
export const FinancialEducation = FinancialEducationService;
