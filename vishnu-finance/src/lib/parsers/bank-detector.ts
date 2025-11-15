/**
 * Bank Detection in TypeScript
 * Detects bank from PDF filename, content, or content
 */

type BankCode = 'SBIN' | 'IDIB' | 'KKBK' | 'HDFC' | 'MAHB' | 'AXIS' | 'ICICI' | 'UNKNOWN';

export interface BankDetectionResult {
  bankCode: BankCode;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect bank from filename
 */
export function detectBankFromFilename(filename: string): BankCode {
  const lower = filename.toLowerCase();
  
  // State Bank of India
  if (lower.includes('sbi') || lower.includes('state bank')) {
    return 'SBIN';
  }
  
  // Indian Bank
  if (lower.includes('indian bank') || lower.includes('idib')) {
    return 'IDIB';
  }
  
  // Kotak Mahindra Bank
  if (lower.includes('kotak') || lower.includes('kkbk')) {
    return 'KKBK';
  }
  
  // HDFC Bank
  if (lower.includes('hdfc')) {
    return 'HDFC';
  }
  
  // Bank of Maharashtra
  if (lower.includes('maharashtra') || lower.includes('mahb') || lower.includes('mahb')) {
    return 'MAHB';
  }
  
  // Axis Bank
  if (lower.includes('axis')) {
    return 'AXIS';
  }
  
  // ICICI Bank
  if (lower.includes('icici')) {
    return 'ICICI';
  }
  
  return 'UNKNOWN';
}

/**
 * Detect bank from PDF text content
 */
export function detectBankFromContent(text: string): BankCode {
  const lower = text.toLowerCase();
  
  // State Bank of India patterns
  if (lower.includes('state bank of india') || 
      lower.includes('sbi') && (lower.includes('account') || lower.includes('statement'))) {
    return 'SBIN';
  }
  
  // Indian Bank patterns
  if (lower.includes('indian bank') || 
      (lower.includes('idib') && lower.includes('account'))) {
    return 'IDIB';
  }
  
  // Kotak Mahindra Bank patterns
  if (lower.includes('kotak mahindra bank') || 
      lower.includes('kotak') && (lower.includes('account') || lower.includes('statement'))) {
    return 'KKBK';
  }
  
  // HDFC Bank patterns
  if (lower.includes('hdfc bank') || 
      (lower.includes('hdfc') && (lower.includes('account') || lower.includes('statement')))) {
    return 'HDFC';
  }
  
  // Bank of Maharashtra patterns
  if (lower.includes('bank of maharashtra') || 
      lower.includes('maharashtra') && lower.includes('bank')) {
    return 'MAHB';
  }
  
  // Axis Bank patterns
  if (lower.includes('axis bank') || 
      (lower.includes('axis') && (lower.includes('account') || lower.includes('statement')))) {
    return 'AXIS';
  }
  
  // ICICI Bank patterns
  if (lower.includes('icici bank') || 
      (lower.includes('icici') && (lower.includes('account') || lower.includes('statement')))) {
    return 'ICICI';
  }
  
  return 'UNKNOWN';
}

/**
 * Detect bank from hint (user-provided or filename)
 */
export function detectBank(bankHint?: string, filename?: string, content?: string): BankDetectionResult {
  let bankCode: BankCode = 'UNKNOWN';
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // First, check user-provided hint
  if (bankHint) {
    const hint = bankHint.toLowerCase();
    if (hint.includes('sbi') || hint.includes('state bank')) {
      bankCode = 'SBIN';
      confidence = 'high';
    } else if (hint.includes('indian bank') || hint.includes('idib')) {
      bankCode = 'IDIB';
      confidence = 'high';
    } else if (hint.includes('kotak') || hint.includes('kkbk')) {
      bankCode = 'KKBK';
      confidence = 'high';
    } else if (hint.includes('hdfc')) {
      bankCode = 'HDFC';
      confidence = 'high';
    } else if (hint.includes('maharashtra') || hint.includes('mahb')) {
      bankCode = 'MAHB';
      confidence = 'high';
    } else if (hint.includes('axis')) {
      bankCode = 'AXIS';
      confidence = 'high';
    } else if (hint.includes('icici')) {
      bankCode = 'ICICI';
      confidence = 'high';
    }
  }
  
  // If no high-confidence match from hint, try filename
  if (confidence === 'low' && filename) {
    const filenameBank = detectBankFromFilename(filename);
    if (filenameBank !== 'UNKNOWN') {
      bankCode = filenameBank;
      confidence = 'medium';
    }
  }
  
  // If still low confidence, try content
  if (confidence === 'low' && content) {
    const contentBank = detectBankFromContent(content);
    if (contentBank !== 'UNKNOWN') {
      bankCode = contentBank;
      confidence = 'medium';
    }
  }
  
  return { bankCode, confidence };
}

