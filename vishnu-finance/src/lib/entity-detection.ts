/**
 * Entity Detection Utility
 * Auto-detects whether a transaction entity (UPI ID, store name, person name) is a STORE or PERSON
 */

export type EntityType = 'PERSON' | 'STORE';

interface DetectionContext {
  name?: string;
  upiId?: string;
  store?: string;
  personName?: string;
  amount?: number;
  description?: string;
}

// Store indicators - common business/merchant keywords
const STORE_KEYWORDS = [
  'mart', 'store', 'shop', 'bazaar', 'bazar',
  'restaurant', 'hotel', 'cafe', 'coffee', 'food',
  'mall', 'market', 'super', 'hyper',
  'restro', 'dine', 'eats', 'pizza', 'burger',
  'petrol', 'fuel', 'gas', 'station',
  'pharmacy', 'medical', 'hospital', 'clinic',
  'cinema', 'theater', 'movie',
  'swiggy', 'zomato', 'uber', 'ola', 'rapido',
  'amazon', 'flipkart', 'myntra', 'paytm',
  'bank', 'atm', 'branch', 'ifsc',
  'taxi', 'auto', 'cab',
  'salon', 'spa', 'beauty',
  'gym', 'fitness', 'health',
  'pvt', 'ltd', 'limited', 'corp', 'inc'
];

// Person indicators - common patterns in Indian names
const PERSON_KEYWORDS = [
  'kumar', 'singh', 'sharma', 'patel', 'gupta',
  'reddy', 'rao', 'naidu', 'iyer', 'menon',
  'nair', 'pillai', 'khan', 'ahmed', 'ali',
  'joshi', 'desai', 'shah', 'mehta', 'jain'
];

// UPI business patterns
const BUSINESS_UPI_PATTERNS = [
  /.*@paytm/i,
  /.*@ybl/i, // PhonePe
  /.*@axl/i, // PhonePe
  /.*@ibl/i, // PhonePe Business
  /.*business/i,
  /.*merchant/i,
  /.*shop/i,
  /.*store/i
];

/**
 * Detect entity type based on context
 */
export function detectEntityType(context: DetectionContext): EntityType {
  const { name, upiId, store, personName, amount, description } = context;
  
  // Use explicit fields if available
  if (store && !personName) return 'STORE';
  if (personName && !store) return 'PERSON';
  
  // Check UPI ID patterns
  if (upiId) {
    const isBusinessUpi = BUSINESS_UPI_PATTERNS.some(pattern => pattern.test(upiId));
    if (isBusinessUpi) return 'STORE';
  }
  
  // Analyze name/description
  const textToAnalyze = (name || store || personName || description || '').toLowerCase();
  
  if (!textToAnalyze) return 'PERSON'; // Default to PERSON
  
  // Check for store keywords
  const hasStoreKeyword = STORE_KEYWORDS.some(keyword => 
    textToAnalyze.includes(keyword.toLowerCase())
  );
  
  if (hasStoreKeyword) return 'STORE';
  
  // Check for person name patterns
  const hasPersonPattern = PERSON_KEYWORDS.some(keyword => 
    textToAnalyze.includes(keyword.toLowerCase())
  );
  
  // Amount heuristic: very large amounts (>50k) are more likely businesses
  if (amount && amount > 50000 && !hasPersonPattern) {
    return 'STORE';
  }
  
  // Default to PERSON for personal names
  if (hasPersonPattern || textToAnalyze.split(' ').length <= 3) {
    return 'PERSON';
  }
  
  // Default to STORE for longer/complex names
  return 'STORE';
}

/**
 * Extract entity name from transaction data
 */
export function extractEntityName(context: DetectionContext): { name: string; type: EntityType } | null {
  const { store, personName, upiId, description } = context;
  
  // Priority: store/personName > upiId > description
  if (store) {
    return { name: store, type: 'STORE' };
  }
  
  if (personName) {
    return { name: personName, type: 'PERSON' };
  }
  
  if (upiId) {
    // Extract name from UPI ID (before @)
    const nameMatch = upiId.split('@')[0];
    if (nameMatch) {
      const type = detectEntityType({ ...context, name: nameMatch });
      return { name: nameMatch, type };
    }
  }
  
  if (description) {
    // Try to extract name from description
    const type = detectEntityType({ ...context, name: description });
    return { name: description.split(' ').slice(0, 3).join(' '), type };
  }
  
  return null;
}

/**
 * Suggest category based on transaction data
 */
export function suggestCategory(
  financialCategory: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER',
  context: DetectionContext
): string | null {
  const { description, store, upiId } = context;
  const text = (description || store || upiId || '').toLowerCase();
  
  if (financialCategory === 'INCOME') {
    if (text.includes('salary') || text.includes('payroll')) return 'Salary';
    if (text.includes('freelance') || text.includes('consulting')) return 'Freelance';
    if (text.includes('business') || text.includes('revenue')) return 'Business';
    if (text.includes('investment') || text.includes('dividend')) return 'Investment';
    return 'Other Income';
  }
  
  if (financialCategory === 'EXPENSE') {
    if (text.includes('food') || text.includes('restaurant') || text.includes('swiggy') || text.includes('zomato')) return 'Food';
    if (text.includes('fuel') || text.includes('petrol') || text.includes('uber') || text.includes('ola')) return 'Transportation';
    if (text.includes('rent') || text.includes('housing') || text.includes('home')) return 'Housing';
    if (text.includes('electricity') || text.includes('water') || text.includes('gas')) return 'Utilities';
    if (text.includes('movie') || text.includes('entertainment') || text.includes('cinema')) return 'Entertainment';
    if (text.includes('medical') || text.includes('hospital') || text.includes('pharmacy')) return 'Healthcare';
    if (text.includes('education') || text.includes('school') || text.includes('course')) return 'Education';
    if (text.includes('amazon') || text.includes('flipkart') || text.includes('shopping')) return 'Shopping';
    if (text.includes('insurance') || text.includes('premium')) return 'Insurance';
    return 'Other Expenses';
  }
  
  return null;
}
