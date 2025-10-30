// User persona system for different types of financial users
export interface UserPersona {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  painPoints: string[];
  goals: string[];
  preferredFeatures: string[];
  uiPreferences: {
    complexity: 'simple' | 'moderate' | 'advanced';
    visualStyle: 'minimal' | 'detailed' | 'rich';
    informationDensity: 'low' | 'medium' | 'high';
    guidanceLevel: 'basic' | 'intermediate' | 'comprehensive';
  };
  onboardingFlow: string[];
  recommendedModules: string[];
  tips: string[];
  warnings: string[];
}

export interface PersonaBasedRecommendation {
  module: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  implementation: string;
}

// User personas based on the strategic report
export const userPersonas: UserPersona[] = [
  {
    id: 'casual-budgeter',
    name: 'Casual Budgeter',
    description: 'Students or salary-earners who want to track everyday spending and build simple budgets',
    characteristics: [
      'Limited financial literacy',
      'Forgets bill payments',
      'No awareness of credit score',
      'Often overspends without realizing',
      'Prefers simple, visual interfaces',
      'Mobile-first usage'
    ],
    painPoints: [
      'Difficulty understanding financial jargon',
      'Forgetting to track expenses',
      'Not knowing where money goes',
      'Missing bill payment deadlines',
      'No clear savings strategy'
    ],
    goals: [
      'Track everyday spending',
      'Build simple budgets (food, travel, bills)',
      'Start saving for vacations or purchases',
      'Avoid overspending',
      'Remember bill payments'
    ],
    preferredFeatures: [
      'Simple expense tracking',
      'Visual pie charts and graphs',
      'Bill reminders',
      'Basic budget alerts',
      'Savings goal tracking',
      'Credit score widget'
    ],
    uiPreferences: {
      complexity: 'simple',
      visualStyle: 'minimal',
      informationDensity: 'low',
      guidanceLevel: 'comprehensive'
    },
    onboardingFlow: [
      'Welcome with simple language',
      'Connect bank account or manual entry',
      'Set up basic categories',
      'Create first budget',
      'Set up bill reminders',
      'Add first savings goal'
    ],
    recommendedModules: [
      'expense-tracking',
      'budget-management',
      'bill-reminders',
      'savings-goals',
      'financial-education'
    ],
    tips: [
      'Use the 50-30-20 rule for budgeting',
      'Set up automatic bill payments',
      'Track expenses for 30 days to understand patterns',
      'Start with small savings goals',
      'Check your credit score monthly'
    ],
    warnings: [
      'Avoid complex investment products initially',
      'Don\'t take on high-interest debt',
      'Be careful with credit cards',
      'Don\'t skip emergency fund building'
    ]
  },
  {
    id: 'freelancer-gig-worker',
    name: 'Freelancer / Gig Worker',
    description: 'Independent workers with irregular income streams who need flexible financial management',
    characteristics: [
      'Irregular income patterns',
      'Multiple income sources',
      'Variable expenses',
      'Need tax planning',
      'Require business expense tracking',
      'Need invoice management'
    ],
    painPoints: [
      'Income volatility makes budgeting difficult',
      'Multiple bank accounts and wallets',
      'Difficulty tracking business vs personal expenses',
      'Tax planning complexity',
      'Cash flow management',
      'Client payment delays'
    ],
    goals: [
      'Manage irregular income streams',
      'Track invoices and receipts',
      'Plan for taxes (GST/ITR)',
      'Build emergency fund for lean periods',
      'Separate business and personal finances',
      'Plan for variable expenses'
    ],
    preferredFeatures: [
      'Income stream tracking',
      'Invoice management',
      'Receipt scanning (OCR)',
      'Tax estimation tools',
      'Business expense categorization',
      'Cash flow forecasting',
      'Client payment tracking'
    ],
    uiPreferences: {
      complexity: 'moderate',
      visualStyle: 'detailed',
      informationDensity: 'medium',
      guidanceLevel: 'intermediate'
    },
    onboardingFlow: [
      'Identify as freelancer/gig worker',
      'Set up multiple income sources',
      'Configure business vs personal categories',
      'Set up tax planning preferences',
      'Connect business accounts',
      'Set up invoice tracking'
    ],
    recommendedModules: [
      'income-management',
      'expense-tracking',
      'tax-planning',
      'invoice-management',
      'cash-flow-forecasting',
      'business-reports'
    ],
    tips: [
      'Keep 3-6 months of expenses in emergency fund',
      'Set aside 25-30% of income for taxes',
      'Separate business and personal accounts',
      'Track all business expenses for deductions',
      'Invoice clients promptly and follow up'
    ],
    warnings: [
      'Don\'t mix personal and business expenses',
      'Keep detailed records for tax purposes',
      'Don\'t spend irregular income before it\'s received',
      'Be prepared for income fluctuations'
    ]
  },
  {
    id: 'young-professional',
    name: 'Young Professional',
    description: 'Urban IT/Office workers who want to save for long-term goals and start investing',
    characteristics: [
      'Stable salary income',
      'Limited time for manual tracking',
      'Multiple financial apps usage',
      'Desire for one-click insights',
      'Long-term goal oriented',
      'Tech-savvy'
    ],
    painPoints: [
      'Limited time to manually log expenses',
      'Juggling multiple financial apps',
      'Choice paralysis among investment options',
      'Desire for consolidated view',
      'Need for automated insights'
    ],
    goals: [
      'Save for long-term goals (house, car, education)',
      'Start investing (mutual funds, stocks)',
      'Reduce existing debts',
      'Track net worth',
      'Optimize tax savings',
      'Plan for retirement'
    ],
    preferredFeatures: [
      'Automated expense categorization',
      'Investment tracking',
      'Net worth dashboard',
      'Goal-based savings',
      'Tax optimization',
      'Credit score monitoring',
      'Investment recommendations'
    ],
    uiPreferences: {
      complexity: 'moderate',
      visualStyle: 'detailed',
      informationDensity: 'medium',
      guidanceLevel: 'intermediate'
    },
    onboardingFlow: [
      'Connect all financial accounts',
      'Set up investment tracking',
      'Define long-term goals',
      'Configure automated savings',
      'Set up tax-saving investments',
      'Enable investment recommendations'
    ],
    recommendedModules: [
      'dashboard',
      'investment-tracking',
      'goal-planning',
      'net-worth-tracking',
      'tax-optimization',
      'credit-monitoring',
      'financial-insights'
    ],
    tips: [
      'Start SIPs early for compound growth',
      'Maximize tax-saving investments under 80C',
      'Maintain 6 months emergency fund',
      'Diversify investments across asset classes',
      'Review and rebalance portfolio annually'
    ],
    warnings: [
      'Don\'t invest money you can\'t afford to lose',
      'Avoid high-interest debt',
      'Don\'t time the market',
      'Be patient with long-term investments'
    ]
  },
  {
    id: 'financial-advisor',
    name: 'Financial Advisor / Wealth Manager',
    description: 'Professionals who manage multiple clients\' portfolios and need comprehensive tools',
    characteristics: [
      'Manages multiple clients',
      'Needs compliance features',
      'Requires detailed reporting',
      'Needs client communication tools',
      'Requires audit trails',
      'Professional presentation needs'
    ],
    painPoints: [
      'Data fragmentation across clients',
      'Manual consolidation processes',
      'Compliance requirements (SEBI, RBI)',
      'Client communication challenges',
      'Report generation complexity',
      'Time management across clients'
    ],
    goals: [
      'Manage multiple client portfolios',
      'Analyze aggregated household finances',
      'Provide advisory services',
      'Generate compliance reports',
      'Demonstrate value to clients',
      'Streamline client communication'
    ],
    preferredFeatures: [
      'Multi-client dashboard',
      'Portfolio analysis tools',
      'Compliance reporting',
      'Client communication portal',
      'Risk profiling tools',
      'White-label customization',
      'Audit trail and logging'
    ],
    uiPreferences: {
      complexity: 'advanced',
      visualStyle: 'rich',
      informationDensity: 'high',
      guidanceLevel: 'basic'
    },
    onboardingFlow: [
      'Set up advisor profile',
      'Configure compliance settings',
      'Set up client management',
      'Import client data',
      'Configure reporting templates',
      'Set up client communication'
    ],
    recommendedModules: [
      'client-management',
      'portfolio-analysis',
      'compliance-reporting',
      'risk-profiling',
      'client-communication',
      'white-label-customization',
      'audit-trails'
    ],
    tips: [
      'Maintain detailed client records',
      'Regular portfolio rebalancing',
      'Clear communication with clients',
      'Stay updated with regulations',
      'Use technology to scale services'
    ],
    warnings: [
      'Ensure compliance with SEBI regulations',
      'Maintain client confidentiality',
      'Document all recommendations',
      'Regular risk assessment updates'
    ]
  }
];

// Persona-based feature recommendations
export const getPersonaRecommendations = (personaId: string): PersonaBasedRecommendation[] => {
  const persona = userPersonas.find(p => p.id === personaId);
  if (!persona) return [];

  const recommendations: PersonaBasedRecommendation[] = [];

  // Casual Budgeter recommendations
  if (personaId === 'casual-budgeter') {
    recommendations.push(
      {
        module: 'expense-tracking',
        priority: 'high',
        reason: 'Essential for understanding spending patterns',
        implementation: 'Simple visual interface with automatic categorization'
      },
      {
        module: 'bill-reminders',
        priority: 'high',
        reason: 'Prevents late fees and improves credit score',
        implementation: 'Push notifications and email reminders'
      },
      {
        module: 'financial-education',
        priority: 'high',
        reason: 'Builds financial literacy gradually',
        implementation: 'Daily tips and interactive tutorials'
      }
    );
  }

  // Freelancer recommendations
  if (personaId === 'freelancer-gig-worker') {
    recommendations.push(
      {
        module: 'income-management',
        priority: 'high',
        reason: 'Critical for managing irregular income streams',
        implementation: 'Multiple income source tracking with forecasting'
      },
      {
        module: 'tax-planning',
        priority: 'high',
        reason: 'Essential for tax compliance and optimization',
        implementation: 'Automated tax calculations and reminders'
      },
      {
        module: 'invoice-management',
        priority: 'high',
        reason: 'Streamlines client payment tracking',
        implementation: 'Invoice creation and payment tracking'
      }
    );
  }

  // Young Professional recommendations
  if (personaId === 'young-professional') {
    recommendations.push(
      {
        module: 'investment-tracking',
        priority: 'high',
        reason: 'Essential for long-term wealth building',
        implementation: 'Portfolio tracking with performance analytics'
      },
      {
        module: 'goal-planning',
        priority: 'high',
        reason: 'Helps achieve long-term financial objectives',
        implementation: 'Goal-based savings with progress tracking'
      },
      {
        module: 'net-worth-tracking',
        priority: 'medium',
        reason: 'Provides comprehensive financial overview',
        implementation: 'Asset and liability tracking with trends'
      }
    );
  }

  // Financial Advisor recommendations
  if (personaId === 'financial-advisor') {
    recommendations.push(
      {
        module: 'client-management',
        priority: 'high',
        reason: 'Core requirement for managing multiple clients',
        implementation: 'Multi-tenant system with role-based access'
      },
      {
        module: 'compliance-reporting',
        priority: 'high',
        reason: 'Essential for regulatory compliance',
        implementation: 'Automated report generation with audit trails'
      },
      {
        module: 'portfolio-analysis',
        priority: 'high',
        reason: 'Critical for providing investment advice',
        implementation: 'Advanced analytics with risk assessment'
      }
    );
  }

  return recommendations;
};

// Persona-based UI customization
export const getPersonaUICustomization = (personaId: string) => {
  const persona = userPersonas.find(p => p.id === personaId);
  if (!persona) return {};

  return {
    theme: persona.uiPreferences.visualStyle === 'minimal' ? 'light' : 'default',
    density: persona.uiPreferences.informationDensity,
    complexity: persona.uiPreferences.complexity,
    guidance: persona.uiPreferences.guidanceLevel,
    features: {
      showAdvancedOptions: persona.uiPreferences.complexity === 'advanced',
      showTooltips: persona.uiPreferences.guidanceLevel === 'comprehensive',
      compactMode: persona.uiPreferences.informationDensity === 'high',
      visualEmphasis: persona.uiPreferences.visualStyle === 'rich'
    }
  };
};

// Persona-based onboarding flow
export const getPersonaOnboardingFlow = (personaId: string) => {
  const persona = userPersonas.find(p => p.id === personaId);
  if (!persona) return [];

  return persona.onboardingFlow.map((step, index) => ({
    id: `step-${index + 1}`,
    title: step,
    completed: false,
    order: index + 1
  }));
};

// Persona-based tips and warnings
export const getPersonaGuidance = (personaId: string) => {
  const persona = userPersonas.find(p => p.id === personaId);
  if (!persona) return { tips: [], warnings: [] };

  return {
    tips: persona.tips,
    warnings: persona.warnings
  };
};

// Persona detection based on user behavior
export const detectPersona = (userBehavior: {
  incomePattern: 'regular' | 'irregular' | 'multiple';
  expenseComplexity: 'simple' | 'moderate' | 'complex';
  goalTypes: string[];
  featureUsage: string[];
  timeSpent: number;
}): string => {
  // Simple heuristic-based detection
  if (userBehavior.incomePattern === 'irregular' || userBehavior.incomePattern === 'multiple') {
    return 'freelancer-gig-worker';
  }

  if (userBehavior.goalTypes.includes('investment') || userBehavior.goalTypes.includes('retirement')) {
    return 'young-professional';
  }

  if (userBehavior.featureUsage.includes('client-management') || userBehavior.featureUsage.includes('compliance')) {
    return 'financial-advisor';
  }

  return 'casual-budgeter'; // Default persona
};

// Export persona service
export const PersonaService = {
  getPersona: (id: string) => userPersonas.find(p => p.id === id),
  getAllPersonas: () => userPersonas,
  getRecommendations: getPersonaRecommendations,
  getUICustomization: getPersonaUICustomization,
  getOnboardingFlow: getPersonaOnboardingFlow,
  getGuidance: getPersonaGuidance,
  detectPersona
};
