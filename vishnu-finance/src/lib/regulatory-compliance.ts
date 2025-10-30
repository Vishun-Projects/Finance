// Regulatory compliance system for Indian financial regulations
export interface ComplianceRequirement {
  id: string;
  regulation: string;
  title: string;
  description: string;
  requirement: string;
  implementation: string;
  priority: 'high' | 'medium' | 'low';
  category: 'data-protection' | 'financial' | 'security' | 'reporting';
  applicableTo: string[];
  lastUpdated: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  dataTypes: string[];
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  withdrawalTimestamp?: Date;
  version: string;
}

export interface DataProcessingRecord {
  id: string;
  userId: string;
  dataType: string;
  purpose: string;
  legalBasis: string;
  timestamp: Date;
  retentionPeriod: number;
  thirdPartySharing: boolean;
  thirdPartyDetails?: string;
}

// DPDP Act 2023 compliance requirements
export const dpdpComplianceRequirements: ComplianceRequirement[] = [
  {
    id: 'dpdp-001',
    regulation: 'DPDP Act 2023',
    title: 'Explicit Consent Collection',
    description: 'Obtain explicit consent before collecting personal data',
    requirement: 'Clear, specific, and informed consent for each data processing purpose',
    implementation: 'Granular consent forms with specific purposes and data types',
    priority: 'high',
    category: 'data-protection',
    applicableTo: ['all-users'],
    lastUpdated: '2023-08-11'
  },
  {
    id: 'dpdp-002',
    regulation: 'DPDP Act 2023',
    title: 'Data Minimization',
    description: 'Collect only necessary data for specified purposes',
    requirement: 'Limit data collection to what is necessary for the stated purpose',
    implementation: 'Data collection forms with clear necessity explanations',
    priority: 'high',
    category: 'data-protection',
    applicableTo: ['all-users'],
    lastUpdated: '2023-08-11'
  },
  {
    id: 'dpdp-003',
    regulation: 'DPDP Act 2023',
    title: 'Purpose Limitation',
    description: 'Use data only for the purpose for which it was collected',
    requirement: 'Clear purpose specification and limitation of use',
    implementation: 'Purpose-based data access controls and audit trails',
    priority: 'high',
    category: 'data-protection',
    applicableTo: ['all-users'],
    lastUpdated: '2023-08-11'
  },
  {
    id: 'dpdp-004',
    regulation: 'DPDP Act 2023',
    title: 'Data Subject Rights',
    description: 'Enable data subject rights (access, rectification, erasure, portability)',
    requirement: 'Provide mechanisms for users to exercise their rights',
    implementation: 'User dashboard with data management options',
    priority: 'high',
    category: 'data-protection',
    applicableTo: ['all-users'],
    lastUpdated: '2023-08-11'
  },
  {
    id: 'dpdp-005',
    regulation: 'DPDP Act 2023',
    title: 'Data Breach Notification',
    description: 'Notify users and authorities of data breaches within 72 hours',
    requirement: 'Automated breach detection and notification system',
    implementation: 'Security monitoring and notification workflows',
    priority: 'high',
    category: 'security',
    applicableTo: ['all-users'],
    lastUpdated: '2023-08-11'
  },
  {
    id: 'dpdp-006',
    regulation: 'DPDP Act 2023',
    title: 'Data Protection Officer',
    description: 'Appoint a Data Protection Officer for compliance oversight',
    requirement: 'Designated DPO with appropriate qualifications',
    implementation: 'DPO contact information and reporting mechanisms',
    priority: 'medium',
    category: 'data-protection',
    applicableTo: ['organization'],
    lastUpdated: '2023-08-11'
  }
];

// RBI compliance requirements
export const rbiComplianceRequirements: ComplianceRequirement[] = [
  {
    id: 'rbi-001',
    regulation: 'RBI Digital Lending Guidelines',
    title: 'Transparent Interest Rates',
    description: 'Display clear and transparent interest rates',
    requirement: 'No hidden charges, clear APR disclosure',
    implementation: 'Transparent pricing display and calculation tools',
    priority: 'high',
    category: 'financial',
    applicableTo: ['lending-features'],
    lastUpdated: '2022-09-02'
  },
  {
    id: 'rbi-002',
    regulation: 'RBI Digital Lending Guidelines',
    title: 'Direct Lending',
    description: 'Ensure direct lending without intermediaries',
    requirement: 'Direct relationship between lender and borrower',
    implementation: 'Direct lending platform without third-party involvement',
    priority: 'high',
    category: 'financial',
    applicableTo: ['lending-features'],
    lastUpdated: '2022-09-02'
  },
  {
    id: 'rbi-003',
    regulation: 'RBI KYC Guidelines',
    title: 'Customer Due Diligence',
    description: 'Implement proper KYC procedures',
    requirement: 'Identity verification and risk assessment',
    implementation: 'KYC verification system with document validation',
    priority: 'high',
    category: 'financial',
    applicableTo: ['all-users'],
    lastUpdated: '2021-05-10'
  }
];

// SEBI compliance requirements
export const sebiComplianceRequirements: ComplianceRequirement[] = [
  {
    id: 'sebi-001',
    regulation: 'SEBI Investment Adviser Regulations',
    title: 'Risk Profiling',
    description: 'Conduct proper risk profiling before investment advice',
    requirement: 'Comprehensive risk assessment and profiling',
    implementation: 'Risk profiling questionnaire and assessment tools',
    priority: 'high',
    category: 'financial',
    applicableTo: ['investment-advice'],
    lastUpdated: '2021-03-15'
  },
  {
    id: 'sebi-002',
    regulation: 'SEBI Investment Adviser Regulations',
    title: 'Suitability Assessment',
    description: 'Ensure investment recommendations are suitable for client',
    requirement: 'Match recommendations with client profile and risk tolerance',
    implementation: 'Suitability assessment algorithms and documentation',
    priority: 'high',
    category: 'financial',
    applicableTo: ['investment-advice'],
    lastUpdated: '2021-03-15'
  },
  {
    id: 'sebi-003',
    regulation: 'SEBI Investment Adviser Regulations',
    title: 'Disclosure Requirements',
    description: 'Provide clear disclosures about fees and conflicts',
    requirement: 'Transparent fee structure and conflict of interest disclosure',
    implementation: 'Clear disclosure documents and fee calculators',
    priority: 'medium',
    category: 'financial',
    applicableTo: ['investment-advice'],
    lastUpdated: '2021-03-15'
  }
];

// All compliance requirements
export const allComplianceRequirements = [
  ...dpdpComplianceRequirements,
  ...rbiComplianceRequirements,
  ...sebiComplianceRequirements
];

// Compliance service
export class ComplianceService {
  private consentRecords: ConsentRecord[] = [];
  private dataProcessingRecords: DataProcessingRecord[] = [];

  // Consent management
  recordConsent(consent: Omit<ConsentRecord, 'id' | 'timestamp'>): ConsentRecord {
    const newConsent: ConsentRecord = {
      ...consent,
      id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    this.consentRecords.push(newConsent);
    return newConsent;
  }

  withdrawConsent(consentId: string): boolean {
    const consent = this.consentRecords.find(c => c.id === consentId);
    if (consent) {
      consent.granted = false;
      consent.withdrawalTimestamp = new Date();
      return true;
    }
    return false;
  }

  getConsentHistory(userId: string): ConsentRecord[] {
    return this.consentRecords.filter(c => c.userId === userId);
  }

  hasValidConsent(userId: string, purpose: string): boolean {
    const consent = this.consentRecords.find(c => 
      c.userId === userId && 
      c.purpose === purpose && 
      c.granted === true &&
      !c.withdrawalTimestamp
    );
    return !!consent;
  }

  // Data processing records
  recordDataProcessing(processing: Omit<DataProcessingRecord, 'id' | 'timestamp'>): DataProcessingRecord {
    const newProcessing: DataProcessingRecord = {
      ...processing,
      id: `processing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    this.dataProcessingRecords.push(newProcessing);
    return newProcessing;
  }

  getDataProcessingHistory(userId: string): DataProcessingRecord[] {
    return this.dataProcessingRecords.filter(p => p.userId === userId);
  }

  // Compliance checking
  checkCompliance(userId: string, feature: string): {
    compliant: boolean;
    missingRequirements: ComplianceRequirement[];
    recommendations: string[];
  } {
    const applicableRequirements = allComplianceRequirements.filter(req => 
      req.applicableTo.includes('all-users') || req.applicableTo.includes(feature)
    );

    const missingRequirements: ComplianceRequirement[] = [];
    const recommendations: string[] = [];

    for (const requirement of applicableRequirements) {
      if (requirement.category === 'data-protection') {
        if (!this.hasValidConsent(userId, requirement.title)) {
          missingRequirements.push(requirement);
          recommendations.push(`Obtain consent for: ${requirement.title}`);
        }
      }
    }

    return {
      compliant: missingRequirements.length === 0,
      missingRequirements,
      recommendations
    };
  }

  // Generate compliance report
  generateComplianceReport(userId: string): {
    summary: {
      totalRequirements: number;
      compliant: number;
      nonCompliant: number;
      complianceScore: number;
    };
    details: {
      category: string;
      requirements: ComplianceRequirement[];
      status: 'compliant' | 'non-compliant' | 'partial';
    }[];
    recommendations: string[];
  } {
    const applicableRequirements = allComplianceRequirements.filter(req => 
      req.applicableTo.includes('all-users')
    );

    const categories = [...new Set(applicableRequirements.map(req => req.category))];
    const details = categories.map(category => {
      const categoryRequirements = applicableRequirements.filter(req => req.category === category);
      const complianceCheck = this.checkCompliance(userId, 'general');
      
      return {
        category,
        requirements: categoryRequirements,
        status: complianceCheck.compliant ? 'compliant' : 'non-compliant' as 'compliant' | 'non-compliant' | 'partial'
      };
    });

    const compliantCount = details.filter(d => d.status === 'compliant').length;
    const complianceScore = (compliantCount / details.length) * 100;

    return {
      summary: {
        totalRequirements: applicableRequirements.length,
        compliant: compliantCount,
        nonCompliant: details.length - compliantCount,
        complianceScore: Math.round(complianceScore)
      },
      details,
      recommendations: this.getComplianceRecommendations(userId)
    };
  }

  private getComplianceRecommendations(userId: string): string[] {
    const recommendations: string[] = [];
    
    // Check DPDP compliance
    if (!this.hasValidConsent(userId, 'data-processing')) {
      recommendations.push('Obtain explicit consent for data processing under DPDP Act');
    }
    
    if (!this.hasValidConsent(userId, 'marketing-communications')) {
      recommendations.push('Obtain consent for marketing communications');
    }
    
    if (!this.hasValidConsent(userId, 'data-analytics')) {
      recommendations.push('Obtain consent for data analytics and insights');
    }

    return recommendations;
  }
}

// Privacy policy generator
export class PrivacyPolicyGenerator {
  static generatePrivacyPolicy(companyDetails: {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
  }): string {
    return `
# Privacy Policy

**Effective Date:** ${new Date().toLocaleDateString()}

## 1. Information We Collect

### Personal Information
- Name, email address, phone number
- Financial information (income, expenses, goals)
- Bank account details (with your consent)
- Device information and usage data

### Automatically Collected Information
- IP address and location data
- Browser type and version
- Usage patterns and preferences
- Cookies and similar technologies

## 2. How We Use Your Information

We use your personal information for the following purposes:
- Providing financial management services
- Processing transactions and payments
- Sending important notifications and updates
- Improving our services and user experience
- Compliance with legal obligations
- Marketing communications (with your consent)

## 3. Legal Basis for Processing

We process your personal information based on:
- **Consent:** For marketing communications and optional features
- **Contract:** To provide our financial services
- **Legal Obligation:** To comply with applicable laws
- **Legitimate Interest:** To improve our services and prevent fraud

## 4. Data Sharing and Disclosure

We may share your information with:
- Service providers who assist in our operations
- Financial institutions for transaction processing
- Legal authorities when required by law
- Third parties with your explicit consent

## 5. Data Security

We implement appropriate technical and organizational measures to protect your personal information:
- Encryption of data in transit and at rest
- Regular security assessments and updates
- Access controls and authentication
- Incident response procedures

## 6. Your Rights

Under the Digital Personal Data Protection Act 2023, you have the right to:
- Access your personal data
- Rectify inaccurate data
- Erase your data
- Port your data
- Withdraw consent
- Grievance redressal

## 7. Data Retention

We retain your personal information for:
- Active account: Duration of your account
- Inactive account: 3 years after last activity
- Legal requirements: As required by applicable laws
- Marketing data: Until consent is withdrawn

## 8. Contact Information

For any privacy-related queries or to exercise your rights:

**Data Protection Officer**
${companyDetails.name}
${companyDetails.address}
Email: ${companyDetails.email}
Phone: ${companyDetails.phone}
Website: ${companyDetails.website}

## 9. Updates to This Policy

We may update this privacy policy from time to time. We will notify you of any material changes through:
- Email notification
- In-app notification
- Website announcement

## 10. Grievance Redressal

If you have any concerns about our data practices, you can:
1. Contact our Data Protection Officer
2. File a complaint with the Data Protection Board of India
3. Seek legal remedies as per applicable laws

---

*This privacy policy is compliant with the Digital Personal Data Protection Act 2023 and other applicable Indian laws.*
    `.trim();
  }
}

// Consent form generator
export class ConsentFormGenerator {
  static generateConsentForm(purposes: string[]): {
    form: string;
    consentItems: Array<{
      id: string;
      purpose: string;
      description: string;
      required: boolean;
      dataTypes: string[];
    }>;
  } {
    const consentItems = purposes.map((purpose, index) => ({
      id: `consent-${index + 1}`,
      purpose,
      description: this.getPurposeDescription(purpose),
      required: this.isRequired(purpose),
      dataTypes: this.getDataTypes(purpose)
    }));

    const form = `
# Consent Form

By using our financial management services, you consent to the following data processing activities:

${consentItems.map(item => `
## ${item.purpose} ${item.required ? '(Required)' : '(Optional)'}

**Description:** ${item.description}

**Data Types:** ${item.dataTypes.join(', ')}

**Consent:** ${item.required ? 'Required for service functionality' : 'Optional - you can withdraw this consent anytime'}

`).join('')}

## Your Rights

You have the right to:
- Withdraw consent for optional data processing
- Access, rectify, or erase your personal data
- Port your data to another service
- File grievances with our Data Protection Officer

## Contact

For any consent-related queries, contact us at privacy@company.com

---

*By continuing to use our service, you acknowledge that you have read and understood this consent form.*
    `.trim();

    return { form, consentItems };
  }

  private static getPurposeDescription(purpose: string): string {
    const descriptions: Record<string, string> = {
      'data-processing': 'Processing your financial data to provide personalized insights and recommendations',
      'marketing-communications': 'Sending you promotional offers, newsletters, and product updates',
      'data-analytics': 'Analyzing your usage patterns to improve our services and develop new features',
      'third-party-sharing': 'Sharing anonymized data with trusted partners for service enhancement',
      'location-tracking': 'Using your location data to provide location-based financial services',
      'biometric-data': 'Using biometric data for secure authentication and fraud prevention'
    };
    return descriptions[purpose] || 'Processing your data for the specified purpose';
  }

  private static isRequired(purpose: string): boolean {
    const requiredPurposes = ['data-processing'];
    return requiredPurposes.includes(purpose);
  }

  private static getDataTypes(purpose: string): string[] {
    const dataTypes: Record<string, string[]> = {
      'data-processing': ['Financial data', 'Transaction history', 'User preferences'],
      'marketing-communications': ['Email address', 'Name', 'Communication preferences'],
      'data-analytics': ['Usage patterns', 'Anonymized data', 'Performance metrics'],
      'third-party-sharing': ['Anonymized data', 'Aggregated insights'],
      'location-tracking': ['GPS coordinates', 'Location history'],
      'biometric-data': ['Fingerprint', 'Face recognition data', 'Voice patterns']
    };
    return dataTypes[purpose] || ['Personal data'];
  }
}

// Export compliance service
export const complianceService = new ComplianceService();
