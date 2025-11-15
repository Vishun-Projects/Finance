/**
 * Node.js PDF Parser - Fallback parser when Python is not available
 * Uses pdf-parse library for basic PDF text extraction
 */

import { readFile } from 'fs/promises';

type BankCode = 'SBIN' | 'IDIB' | 'KKBK' | 'HDFC' | 'MAHB' | 'AXIS' | 'ICICI' | 'UNKNOWN';

export interface ParsedTransaction {
  date?: string;
  date_iso?: string;
  description?: string;
  amount?: number;
  type?: 'CREDIT' | 'DEBIT';
  balance?: number;
  bankCode?: BankCode;
  [key: string]: any;
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  count: number;
  metadata?: {
    openingBalance?: number;
    closingBalance?: number;
    accountNumber?: string;
    ifsc?: string;
    branch?: string;
    accountHolderName?: string;
    statementStartDate?: string;
    statementEndDate?: string;
    totalCredits?: number;
    totalDebits?: number;
    transactionCount?: number;
  };
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = await readFile(filePath);
    // Use require for server-side code to avoid ESM import issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Parse date string to ISO format (YYYY-MM-DD)
 * Handles DD/MM/YYYY, MM/DD/YYYY, and other common formats
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const cleaned = dateStr.trim().replace(/[^\d\/\-\.]/g, '');
  
  // Try DD/MM/YYYY format first (common in Indian banks)
  const ddmmyyyy = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/.exec(cleaned);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  
  // Try YYYY-MM-DD format
  const yyyymmdd = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/.exec(cleaned);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  // Try parsing with Date object
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Extract amount from string
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;
  
  // Remove currency symbols and commas
  const cleaned = amountStr.replace(/[₹,\s]/g, '').trim();
  
  // Handle negative amounts
  const isNegative = cleaned.includes('Dr') || cleaned.includes('DB') || cleaned.startsWith('-');
  const numericStr = cleaned.replace(/[^\d.]/g, '');
  
  const amount = parseFloat(numericStr);
  if (isNaN(amount)) return null;
  
  return isNegative ? -Math.abs(amount) : Math.abs(amount);
}

/**
 * Detect transaction type from description and amount
 */
function detectTransactionType(description: string, amount: number): 'CREDIT' | 'DEBIT' {
  const desc = description.toLowerCase();
  
  // Credit indicators
  if (desc.includes('credit') || desc.includes('cr') || desc.includes('deposit') || 
      desc.includes('salary') || desc.includes('interest') || amount > 0) {
    return 'CREDIT';
  }
  
  // Debit indicators
  if (desc.includes('debit') || desc.includes('dr') || desc.includes('withdrawal') || 
      desc.includes('payment') || desc.includes('transfer') || amount < 0) {
    return 'DEBIT';
  }
  
  return amount >= 0 ? 'CREDIT' : 'DEBIT';
}

/**
 * Basic transaction extraction from PDF text
 * This is a simplified parser - Python parsers are more accurate
 */
function extractTransactions(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Common patterns for transaction lines
  // Format: Date | Description | Amount | Balance
  const datePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/;
  const amountPattern = /[₹]?\s*\d+([,\.]\d+)*/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line contains a date
    if (datePattern.test(line)) {
      const parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
      
      if (parts.length >= 2) {
        const dateStr = parts[0];
        const dateIso = parseDate(dateStr);
        
        if (dateIso) {
          // Try to extract amount (usually last or second-to-last part)
          let amount: number | null = null;
          let description = parts.slice(1, -1).join(' ');
          
          // Check last part for amount
          const lastPart = parts[parts.length - 1];
          const amountMatch = lastPart.match(amountPattern);
          if (amountMatch) {
            amount = parseAmount(lastPart);
            if (amount === null && parts.length > 2) {
              description = parts.slice(1, -2).join(' ');
            }
          } else {
            // Amount might be in second-to-last
            if (parts.length >= 3) {
              const secondLast = parts[parts.length - 2];
              amount = parseAmount(secondLast);
              if (amount !== null) {
                description = parts.slice(1, -2).join(' ');
              }
            }
          }
          
          if (amount !== null && description.length > 0) {
            transactions.push({
              date: dateStr,
              date_iso: dateIso,
              description: description.trim(),
              amount: Math.abs(amount),
              type: detectTransactionType(description, amount),
              balance: undefined, // Balance extraction is complex
            });
          }
        }
      }
    }
  }
  
  return transactions;
}

/**
 * Extract metadata from PDF text
 */
function extractMetadata(text: string, transactions: ParsedTransaction[]): ParseResult['metadata'] {
  const metadata: ParseResult['metadata'] = {};
  
  // Extract account number
  const accountMatch = text.match(/account\s*(?:no|number|#)[\s:]*([A-Z0-9]+)/i);
  if (accountMatch) {
    metadata.accountNumber = accountMatch[1].trim();
  }
  
  // Extract IFSC
  const ifscMatch = text.match(/ifsc[\s:]*([A-Z]{4}0[A-Z0-9]{6})/i);
  if (ifscMatch) {
    metadata.ifsc = ifscMatch[1].trim();
  }
  
  // Extract opening/closing balance
  const openingMatch = text.match(/opening\s*balance[\s:]*[₹]?\s*([\d,]+\.?\d*)/i);
  if (openingMatch) {
    metadata.openingBalance = parseFloat(openingMatch[1].replace(/,/g, ''));
  }
  
  const closingMatch = text.match(/closing\s*balance[\s:]*[₹]?\s*([\d,]+\.?\d*)/i);
  if (closingMatch) {
    metadata.closingBalance = parseFloat(closingMatch[1].replace(/,/g, ''));
  }
  
  // Calculate totals from transactions
  if (transactions.length > 0) {
    const credits = transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + (t.amount || 0), 0);
    const debits = transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + (t.amount || 0), 0);
    
    metadata.totalCredits = credits;
    metadata.totalDebits = debits;
    metadata.transactionCount = transactions.length;
  }
  
  return metadata;
}

/**
 * Main parsing function
 * @param filePath - Path to the PDF file
 * @param _bankHint - Optional bank hint (reserved for future use)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function parsePDFWithNode(filePath: string, _bankHint?: string): Promise<ParseResult> {
  try {
    console.log('📄 Node.js PDF Parser: Starting text extraction');
    
    // Extract text from PDF
    const text = await extractTextFromPDF(filePath);
    
    if (!text || text.length < 100) {
      return {
        success: false,
        transactions: [],
        count: 0,
        metadata: {},
      };
    }
    
    console.log(`📄 Node.js PDF Parser: Extracted ${text.length} characters`);
    
    // Extract transactions
    const transactions = extractTransactions(text);
    console.log(`📄 Node.js PDF Parser: Found ${transactions.length} transactions`);
    
    // Extract metadata
    const metadata = extractMetadata(text, transactions);
    
    return {
      success: true,
      transactions,
      count: transactions.length,
      metadata,
    };
  } catch (error) {
    console.error('❌ Node.js PDF Parser: Error:', error);
    return {
      success: false,
      transactions: [],
      count: 0,
      metadata: {},
    };
  }
}

