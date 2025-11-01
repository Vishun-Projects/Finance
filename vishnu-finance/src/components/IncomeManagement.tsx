'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DollarSign, 
  Plus, 
  Calendar, 
  Save, 
  Edit, 
  Trash2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  X,
  TrendingUp,
  Search,
  Filter,
  Download,
  Tag,
  CreditCard,
  Briefcase,
  Upload,
  FileText,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCurrency } from '../contexts/CurrencyContext';
import { useToast } from '../contexts/ToastContext';
import { DateRangeFilter } from './ui/date-range-filter';

interface Income {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  notes?: string;
  store?: string;
  personName?: string;
  commodity?: string;
  upiId?: string;
  accountNumber?: string;
}

interface BankTransaction {
  debit?: number | string;
  credit?: number | string;
  description?: string;
  date?: string;
  date_iso?: string;
  category?: string;
  narration?: string;
  bankCode?: string;
  transactionId?: string;
  accountNumber?: string;
  transferType?: string;
  personName?: string;
  upiId?: string;
  branch?: string;
  store?: string;
  commodity?: string;
  rawData?: string;
  raw?: string;
  [key: string]: unknown;
}

interface ApiIncome {
  id: string;
  name?: string;
  amount: number | string;
  categoryId?: string;
  startDate: string | Date;
  notes?: string;
  [key: string]: unknown;
}

interface ImportRecord {
  title: string;
  amount: number | string;
  category?: string;
  date: string;
  description?: string;
  payment_method?: string;
  notes?: string;
  type?: 'income' | 'expense';
  bankCode?: string;
  transactionId?: string;
  accountNumber?: string;
  transferType?: string;
  personName?: string;
  upiId?: string;
  branch?: string;
  store?: string;
  commodity?: string;
  rawData?: string;
}

export default function IncomeManagement() {
  const { user, loading: authLoading } = useAuth();
  const { formatCurrency } = useCurrency();
  const { success, error: showError } = useToast();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterCommodity, setFilterCommodity] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    // Default to 2 years ago to include imported bank statements
    const now = new Date();
    return new Date(now.getFullYear() - 2, 0, 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to end of current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: '',
    description: '',
    paymentMethod: '',
    notes: ''
  });
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<BankTransaction[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [previewMonthOnly, setPreviewMonthOnly] = useState<boolean>(false); // Default to false to show all transactions
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewPageSize, setPreviewPageSize] = useState<number>(200);
  const [parseProgress, setParseProgress] = useState<number>(0);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [tempFiles, setTempFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const filteredParsed = useMemo(() => {
    console.log('🔍 FILTERING: parsedTransactions.length:', parsedTransactions.length);
    console.log('🔍 FILTERING: previewMonthOnly:', previewMonthOnly);
    
    if (!previewMonthOnly) {
      console.log('✅ FILTERING: Returning ALL transactions (not filtering)');
      return parsedTransactions;
    }
    
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('🔍 FILTERING: Date range:', {
      start: start.toISOString(),
      end: end.toISOString(),
      currentMonth: now.getMonth() + 1,
      currentYear: now.getFullYear()
    });
    
    const filtered = parsedTransactions.filter((t: BankTransaction) => {
      const dStr = (t.date_iso || t.date || '').toString().slice(0, 10);
      const d = dStr ? new Date(dStr) : null;
      const inRange = d && d >= start && d <= end;
      
      if (!inRange && parsedTransactions.indexOf(t) < 3) {
        console.log('⚠️ FILTERING: Transaction filtered out:', {
          date: dStr,
          parsedDate: d,
          inRange: false
        });
      }
      
      return inRange;
    });
    
    console.log('✅ FILTERING: Filtered result:', filtered.length, 'transactions');
    return filtered;
  }, [parsedTransactions, previewMonthOnly]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredParsed.length / previewPageSize)), [filteredParsed.length, previewPageSize]);
  const visibleParsed = useMemo(() => {
    const startIdx = (previewPage - 1) * previewPageSize;
    return filteredParsed.slice(startIdx, startIdx + previewPageSize);
  }, [filteredParsed, previewPage, previewPageSize]);

  // formatCurrency is now provided by the CurrencyContext

  const fetchIncomes = useCallback(async () => {
    console.log('🔄 INCOME COMPONENT - Fetching incomes...');
    console.log('🔄 INCOME COMPONENT - User ID:', user?.id);
    
    if (!user?.id) {
      console.log('❌ INCOME COMPONENT - No user ID available');
      setIsFetching(false);
      return;
    }

    try {
      console.log('🔄 INCOME COMPONENT - Making API call to /api/income...');
      const response = await fetch(`/api/income?userId=${user.id}&start=${startDate}&end=${endDate}`);
      console.log('🔄 INCOME COMPONENT - API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ INCOME COMPONENT - API Response data:', JSON.stringify(data, null, 2));
        // Transform the data to match the frontend interface
        // Filter out invalid records during transformation
        const transformedData = data
          .map((income: ApiIncome) => {
            const amount = parseFloat(String(income.amount || 0));
            // Skip invalid incomes
            if (!amount || amount <= 0 || isNaN(amount) || !isFinite(amount)) {
              console.warn('⚠️ Skipping invalid income:', income);
              return null;
            }
            // Normalize date to ISO format (YYYY-MM-DD)
            let dateStr = '';
            if (income.startDate) {
              try {
                const date = new Date(income.startDate);
                if (!isNaN(date.getTime())) {
                  dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD format
                } else {
                  // If date is already a string, try to extract ISO format
                  const dateMatch = income.startDate.toString().match(/(\d{4}-\d{2}-\d{2})/);
                  if (dateMatch) {
                    dateStr = dateMatch[0];
                  }
                }
              } catch {
                // If date is already a string, try to extract ISO format
                const dateMatch = income.startDate.toString().match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                  dateStr = dateMatch[0];
                }
              }
            }
            
            // Ensure we have a valid date, otherwise use today
            if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              dateStr = new Date().toISOString().slice(0, 10);
            }
            
            return {
              id: income.id,
              title: income.name || '', // Map name to title
              amount: amount,
              category: income.categoryId || '',
              date: dateStr, // Use normalized ISO date
              description: income.notes || '',
              paymentMethod: '',
              receiptUrl: '',
              notes: income.notes || '',
              store: income.store || '',
              personName: income.personName || '',
              commodity: income.notes || '', // commodity is stored in notes field
              upiId: income.upiId || '',
              accountNumber: income.accountNumber || ''
            };
          })
          .filter(Boolean) as Income[];
        
        console.log(`✅ Transformed ${transformedData.length} valid incomes out of ${data.length} total`);
        const totalSum = transformedData.reduce((sum, inc) => sum + inc.amount, 0);
        console.log(`📊 Total income sum: ₹${totalSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
        setIncomes(transformedData);
      } else {
        const errorData = await response.json();
        console.log('❌ INCOME COMPONENT - API Error response:', JSON.stringify(errorData, null, 2));
        throw new Error('Failed to fetch incomes');
      }
    } catch (error) {
      console.error('❌ INCOME COMPONENT - Error fetching incomes:', error);
      setError('Failed to fetch incomes');
      showError('Error', 'Failed to fetch incomes');
    } finally {
      setIsFetching(false);
    }
  }, [user?.id, startDate, endDate, showError]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchIncomes();
    }
  }, [user, authLoading, fetchIncomes]);

  // Debug effect to track state changes
  useEffect(() => {
    console.log('🔍 STATE CHANGE: showCsvPreview =', showCsvPreview);
    console.log('🔍 STATE CHANGE: parsedTransactions.length =', parsedTransactions.length);
    if (parsedTransactions.length > 0) {
      console.log('🔍 STATE CHANGE: First 3 parsed transactions:', parsedTransactions.slice(0, 3));
    }
  }, [showCsvPreview, parsedTransactions]);

  // Download sample CSV template
  const downloadSampleTemplate = () => {
    const headers = 'Title,Amount,Category,Date,Description,Payment Method,Notes';
    const sampleRows = [
      'Salary - January 2024,50000,Salary,2024-01-01,Monthly salary,Bank Transfer,Fixed monthly income',
      'Freelance Project,15000,Freelance,2024-01-15,Web development project,UPI,Completed successfully',
      'Investment Dividend,2500,Investment,2024-01-20,Stock dividends,Auto Credit,Quarterly dividend',
      'Rental Income,12000,Rental,2024-01-05,House rent,Bank Transfer,Monthly rental income'
    ];
    
    const csvContent = `${headers}\n${sampleRows.join('\n')}`;

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'income_template.csv';
    link.click();
  };

  // Parse CSV file
  const parseCSV = (text: string): Record<string, string>[] => {
    // Remove BOM if present
    const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    
    const lines = cleanText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    // Simple CSV parser that handles commas in quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"' && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          // Toggle quote state
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add last field
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.every(v => !v)) continue; // Skip empty rows
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  // Handle CSV file selection
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setImportFile(file);
        setImportError(null);
      } else {
        setImportError('Please select a CSV file');
      }
    }
  };

  // Handle multi-format file selection
  const handleMultiFormatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const supportedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      const supportedExtensions = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.txt'];
      const hasValidType = supportedTypes.includes(file.type);
      const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!hasValidType && !hasValidExtension) {
        setFileError('Please select a valid file (PDF, XLS, XLSX, DOC, DOCX, or TXT)');
        return;
      }
      setSelectedFile(file);
      setFileError(null);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const supportedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      const supportedExtensions = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.txt'];
      const hasValidType = supportedTypes.includes(file.type);
      const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (hasValidType || hasValidExtension) {
        setSelectedFile(file);
        setFileError(null);
      } else {
        setFileError('Please drop a valid file (PDF, XLS, XLSX, DOC, DOCX, or TXT)');
      }
    }
  };

  // Parse file and extract transactions
  const handleParseFile = async () => {
    if (!selectedFile || !user?.id) return;

    setIsParsingFile(true);
    setParseProgress(5);
    setFileError(null);

    try {
      // Simulate progressive parse progress up to 90%
      const parseTimer = setInterval(() => {
        setParseProgress((p) => (p < 90 ? Math.min(90, p + 5) : p));
      }, 400);
      const lowerName = selectedFile.name.toLowerCase();
      const isPdf = selectedFile.type === 'application/pdf' || lowerName.endsWith('.pdf');

      if (isPdf) {
        const fd = new FormData();
        fd.append('pdf', selectedFile);
        // Simple bank auto-detect from filename
        const bank = ['sbi', 'hdfc', 'icici', 'axis', 'bob', 'kotak', 'yes'].find(b => lowerName.includes(b)) || '';
        const bankToSend = (selectedBank || bank);
        if (bankToSend) fd.append('bank', bankToSend);

        console.log('🔍 FRONTEND: Starting parse-pdf fetch...');
        const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
        console.log('🔍 FRONTEND: Response status:', res.ok);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to parse PDF');
        }
        const data = await res.json();
        console.log('🔍 FRONTEND: Received data:', {
          success: data.success,
          count: data.count,
          transactionsLength: data.transactions?.length,
          firstTransaction: data.transactions?.[0],
          hasTempFiles: !!data.tempFiles,
          tempFilesCount: data.tempFiles?.length
        });
        
        const transactionsToSet = data.transactions || [];
        console.log('🔍 FRONTEND: Setting parsedTransactions:', transactionsToSet.length, 'items');
        console.log('🔍 FRONTEND: First 3 transactions:', transactionsToSet.slice(0, 3));
        
        setParsedTransactions(transactionsToSet);
        setTempFiles(data.tempFiles || []);
        console.log('🔍 FRONTEND: parsedTransactions state set');
        
        console.log('🔍 FRONTEND: Setting showCsvPreview to true');
        setShowCsvPreview(true);
        
        console.log('🔍 FRONTEND: Closing file dialog');
        setShowFileDialog(false);
        
        success('PDF Parsed', `Extracted ${data.count || transactionsToSet.length} transactions`);
        setParseProgress(100);
        clearInterval(parseTimer);
        console.log('✅ FRONTEND: Parse complete');
        return;
      }

      // Fallback to multi-format parser for non-PDF
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await fetch('/api/parse-file', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to parse file (Status: ${response.status})`);
      }
      const data = await response.json();
      setParsedTransactions(data.transactions || []);
      setTempFiles(data.tempFiles || []);
      setShowCsvPreview(true);
      setShowFileDialog(false);
      success('File Parsed', `Extracted ${data.count || (data.transactions || []).length} transactions`);
      setParseProgress(100);
    } catch (error) {
      console.error('Error parsing file:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsParsingFile(false);
      // Ensure progress is completed/cleared shortly after
      setTimeout(() => setParseProgress(0), 1000);
    }
  };

  // Import parsed transactions using batch API
  const handleImportParsedTransactions = async () => {
    if (!parsedTransactions.length || !user?.id) return;

    setIsImporting(true);
    setImportProgress(5);
    setFileError(null);

    try {
      // Normalize to common structure - extract only plain data values to avoid circular references
      const normalized = parsedTransactions
        .map((t) => {
          try {
            // Extract only primitive values to avoid circular references
            const safeTransaction = {
              debit: typeof t.debit === 'number' ? t.debit : parseFloat(t.debit || '0'),
              credit: typeof t.credit === 'number' ? t.credit : parseFloat(t.credit || '0'),
              description: String(t.description || t.narration || '').trim(),
              date: t.date ? String(t.date) : '',
              date_iso: t.date_iso ? String(t.date_iso) : '',
              category: t.category ? String(t.category) : '',
              narration: t.narration ? String(t.narration) : '',
              // Preserve bank-specific fields
              bankCode: t.bankCode,
              transactionId: t.transactionId,
              accountNumber: t.accountNumber,
              transferType: t.transferType,
              personName: t.personName,
              upiId: t.upiId,
              branch: t.branch,
              store: t.store,
              commodity: t.commodity,
              rawData: t.raw || t.rawData,
            };
            
            const debitAmount = safeTransaction.debit;
            const creditAmount = safeTransaction.credit;
            const isIncome = creditAmount > 0;
            const amount = isIncome ? creditAmount : debitAmount;
            const title = safeTransaction.description;
            
            // Properly parse and normalize date to ISO format (YYYY-MM-DD)
            let dateStr = '';
            if (safeTransaction.date_iso) {
              dateStr = safeTransaction.date_iso.slice(0, 10);
            } else if (safeTransaction.date) {
              // Try to parse various date formats
              const dateInput = safeTransaction.date;
              try {
                const parsedDate = new Date(dateInput);
                if (!isNaN(parsedDate.getTime())) {
                  // Validate date is reasonable (between 2020-2026)
                  const year = parsedDate.getFullYear();
                  if (year >= 2020 && year <= 2026) {
                    dateStr = parsedDate.toISOString().slice(0, 10);
                  }
                }
              } catch {
                // If parsing fails, try extracting date pattern
                const dateMatch = dateInput.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/);
                if (dateMatch) {
                  try {
                    const parsedDate = new Date(dateMatch[0]);
                    if (!isNaN(parsedDate.getTime())) {
                      dateStr = parsedDate.toISOString().slice(0, 10);
                    }
                  } catch {}
                }
              }
            }
            
            // Validate date format is correct (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const isValidDate = dateStr && dateRegex.test(dateStr);
            
            return amount > 0 && title && isValidDate
              ? {
                  title,
                  amount,
                  category: safeTransaction.category || (isIncome ? 'Bank Statement' : 'Bank Statement Expense'),
                  date: dateStr, // Use the normalized date string
                  description: safeTransaction.description,
                  payment_method: 'Bank Transfer',
                  type: isIncome ? 'income' : 'expense',
                  // Include bank-specific fields
                  bankCode: safeTransaction.bankCode,
                  transactionId: safeTransaction.transactionId,
                  accountNumber: safeTransaction.accountNumber,
                  transferType: safeTransaction.transferType,
                  personName: safeTransaction.personName,
                  upiId: safeTransaction.upiId,
                  branch: safeTransaction.branch,
                  store: safeTransaction.store,
                  commodity: safeTransaction.commodity,
                  rawData: safeTransaction.rawData,
                }
              : null;
          } catch (error) {
            console.warn('⚠️ Error normalizing transaction:', error);
            return null;
          }
        })
        .filter(Boolean) as ImportRecord[];

      if (!normalized.length) {
        showError('No valid records', 'No transactions to import');
        setIsImporting(false);
        return;
      }

      // Simulate import progress up to 90% while waiting for server
      const importTimer = setInterval(() => {
        setImportProgress((p) => (p < 90 ? Math.min(90, p + 4) : p));
      }, 300);
      // Use bank statement import API which handles bank-specific fields
      const response = await fetch('/api/import-bank-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, type: 'income', records: normalized }), // type is fallback only
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Batch import failed');
      }
      const result = await response.json();
      const incomeCount = result.incomeInserted || 0;
      const expenseCount = result.expenseInserted || 0;
      const totalInserted = result.inserted || (incomeCount + expenseCount);
      
      success('Imported', `Inserted ${totalInserted} records (${incomeCount} income, ${expenseCount} expenses), ${result.duplicates || 0} duplicates`);
      setImportProgress(100);
      clearInterval(importTimer);
      // Refetch with expanded date range to show imported transactions
      await fetchIncomes();
      
      // Clean up temporary files after successful import
      if (tempFiles.length > 0) {
        try {
          console.log('🧹 Cleaning up temporary files:', tempFiles);
          const cleanupResponse = await fetch('/api/cleanup-temp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: tempFiles })
          });
          if (cleanupResponse.ok) {
            const cleanupResult = await cleanupResponse.json();
            console.log('✅ Cleanup successful:', cleanupResult);
            setTempFiles([]);
          } else {
            console.warn('⚠️ Cleanup failed, but import succeeded');
          }
        } catch (error) {
          console.warn('⚠️ Cleanup error, but import succeeded:', error);
        }
      }
    } catch (e) {
      console.error('Batch import error', e);
      setFileError(e instanceof Error ? e.message : 'Batch import failed');
      showError('Import failed', e instanceof Error ? e.message : 'Batch import failed');
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportProgress(0), 1000);
    }
  };

  // Import CSV data with deduplication
  const handleImportCSV = async () => {
    if (!importFile || !user?.id) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const text = await importFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('No data found in CSV file');
      }

      // First, fetch existing incomes to check for duplicates
      const n = new Date();
      const s = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0];
      const e = new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0];
      const existingResponse = await fetch(`/api/income?userId=${user.id}&start=${s}&end=${e}`);
      let existingIncomes: Income[] = [];
      
      if (existingResponse.ok) {
        const existingData = await existingResponse.json();
        existingIncomes = existingData.map((income: ApiIncome) => ({
          id: income.id,
          title: income.name || '',
          amount: parseFloat(String(income.amount)),
          category: income.categoryId || '',
          date: typeof income.startDate === 'string' ? income.startDate : 
                income.startDate instanceof Date ? income.startDate.toISOString().slice(0, 10) : 
                new Date().toISOString().slice(0, 10),
          description: income.notes || '',
          paymentMethod: '',
          notes: income.notes || ''
        }));
      }

      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;

      // Import each row with duplicate checking
      for (const row of rows) {
        try {
          // Map CSV columns to form data
          const incomeData = {
            title: row['Title'] || '',
            amount: row['Amount'] || '0',
            category: row['Category'] || '',
            date: row['Date'] || new Date().toISOString().split('T')[0],
            description: row['Description'] || '',
            paymentMethod: row['Payment Method'] || '',
            notes: row['Notes'] || '',
            userId: user.id
          };

          // Validate required fields
          if (!incomeData.title || !incomeData.amount) {
            errorCount++;
            continue;
          }

          // Check for duplicates
          const isDuplicate = existingIncomes.some((existing: Income) => {
            // Check for exact matches
            const sameDate = existing.date === incomeData.date;
            const sameAmount = Math.abs(existing.amount - parseFloat(incomeData.amount)) < 0.01;
            const sameTitle = existing.title.toLowerCase().trim() === incomeData.title.toLowerCase().trim();
            
            // Consider it a duplicate if date, amount, and title match
            return sameDate && sameAmount && sameTitle;
          });

          if (isDuplicate) {
            duplicateCount++;
            console.log(`Skipping duplicate CSV entry: ${incomeData.title} - ${incomeData.date} - ${incomeData.amount}`);
            continue;
          }

          // Create income via API
          const response = await fetch('/api/income', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incomeData)
          });

          if (response.ok) {
            successCount++;
            // Add to existing incomes to prevent duplicates in the same batch
            existingIncomes.push({
              id: `temp_${Date.now()}_${successCount}`,
              title: incomeData.title,
              amount: parseFloat(incomeData.amount),
              category: incomeData.category,
              date: incomeData.date,
              description: incomeData.description,
              paymentMethod: incomeData.paymentMethod,
              notes: incomeData.notes
            });
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
          console.error('Error importing row:', err);
        }
      }

      // Refresh the list
      await fetchIncomes();

      // Show success message with duplicate info
      let message = `Successfully imported ${successCount} income entries`;
      if (duplicateCount > 0) {
        message += ` (${duplicateCount} duplicates skipped)`;
      }
      if (errorCount > 0) {
        message += ` (${errorCount} failed)`;
      }

      if (successCount > 0) {
        success('Import Complete', message);
      } else if (duplicateCount > 0) {
        success('Import Complete', `All ${duplicateCount} entries were duplicates and skipped`);
      } else {
        showError('Import Failed', 'No income entries were imported. Please check your CSV format.');
      }

      // Reset
      setShowImportDialog(false);
      setImportFile(null);
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 INCOME COMPONENT - Form submitted');
    console.log('📝 INCOME COMPONENT - Form data:', {
      title: formData.title,
      amount: formData.amount,
      category: formData.category,
      date: formData.date,
      description: formData.description,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      userId: user?.id
    });

    if (!user?.id) {
      console.log('❌ INCOME COMPONENT - No user ID for form submission');
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEditMode && editingIncome) {
        // Edit existing income
        console.log('✏️ INCOME COMPONENT - Making PUT request to /api/income...');
        const response = await fetch('/api/income', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingIncome.id,
            ...formData,
            userId: user.id
          }),
        });

        console.log('✏️ INCOME COMPONENT - PUT Response status:', response.status);
        
        if (response.ok) {
          const updatedIncome = await response.json();
          console.log('✅ INCOME COMPONENT - Successfully updated income:', JSON.stringify(updatedIncome, null, 2));
          // Transform the updated income data to match the frontend interface
          const transformedUpdatedIncome = {
            id: updatedIncome.id,
            title: updatedIncome.name || '',
            amount: parseFloat(updatedIncome.amount),
            category: updatedIncome.categoryId || '',
            date: updatedIncome.startDate,
            description: updatedIncome.notes || '',
            paymentMethod: '',
            receiptUrl: '',
            notes: updatedIncome.notes || ''
          };
          setIncomes(prev => prev.map(income => 
            income.id === editingIncome.id ? transformedUpdatedIncome : income
          ));
          resetForm();
          success('Income Updated', 'Income has been updated successfully!');
        } else {
          const errorData = await response.json();
          console.log('❌ INCOME COMPONENT - PUT Error response:', JSON.stringify(errorData, null, 2));
          throw new Error(errorData.error || 'Failed to update income');
        }
      } else {
        // Create new income
        console.log('📝 INCOME COMPONENT - Making POST request to /api/income...');
        const response = await fetch('/api/income', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            userId: user.id
          }),
        });

        console.log('📝 INCOME COMPONENT - POST Response status:', response.status);
        
        if (response.ok) {
          const newIncome = await response.json();
          console.log('✅ INCOME COMPONENT - Successfully created income:', JSON.stringify(newIncome, null, 2));
          // Transform the new income data to match the frontend interface
          const transformedNewIncome = {
            id: newIncome.id,
            title: newIncome.name || '',
            amount: parseFloat(newIncome.amount),
            category: newIncome.categoryId || '',
            date: newIncome.startDate,
            description: newIncome.notes || '',
            paymentMethod: '',
            receiptUrl: '',
            notes: newIncome.notes || ''
          };
          setIncomes(prev => [transformedNewIncome, ...prev]);
          resetForm();
          success('Income Added', 'New income has been added successfully!');
        } else {
          const errorData = await response.json();
          console.log('❌ INCOME COMPONENT - POST Error response:', JSON.stringify(errorData, null, 2));
          throw new Error(errorData.error || 'Failed to add income');
        }
      }
    } catch (err) {
      console.error('❌ INCOME COMPONENT - Error submitting income:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit income. Please try again.');
      showError('Error', err instanceof Error ? err.message : 'Failed to submit income. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: '',
      date: '',
      description: '',
      paymentMethod: '',
      notes: ''
    });
    setEditingIncome(null);
    setIsEditMode(false);
    setShowForm(false);
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsEditMode(true);
    
    // Normalize date to YYYY-MM-DD format for form input
    let normalizedDate = '';
    if (income.date) {
      try {
        const date = new Date(income.date);
        if (!isNaN(date.getTime())) {
          normalizedDate = date.toISOString().slice(0, 10);
        } else {
          // If date is already a string, try to extract ISO format
          const dateMatch = income.date.toString().match(/(\d{4}-\d{2}-\d{2})/);
          normalizedDate = dateMatch ? dateMatch[0] : income.date.toString().slice(0, 10);
        }
      } catch {
        normalizedDate = income.date.toString().slice(0, 10);
      }
    }
    
    setFormData({
      title: income.title,
      amount: income.amount.toString(),
      category: income.category,
      date: normalizedDate,
      description: income.description || '',
      paymentMethod: income.paymentMethod || '',
      notes: income.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this income?')) return;

    try {
      const response = await fetch(`/api/income?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIncomes(prev => prev.filter(income => income.id !== id));
      } else {
        throw new Error('Failed to delete income');
      }
    } catch (error) {
      console.error('Error deleting income:', error);
      setError('Failed to delete income. Please try again.');
    }
  };

  const filteredIncomes = incomes.filter(income => {
    const matchesSearch = (income.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (income.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (income.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || income.category === filterCategory;
    const matchesStore = filterStore === 'all' || 
                         (income.store && income.store.toLowerCase().includes(filterStore.toLowerCase())) ||
                         (income.personName && income.personName.toLowerCase().includes(filterStore.toLowerCase()));
    const matchesCommodity = filterCommodity === 'all' || 
                             (income.commodity && income.commodity.toLowerCase().includes(filterCommodity.toLowerCase()));
    
    return matchesSearch && matchesCategory && matchesStore && matchesCommodity;
  });

  const storesPersons = Array.from(new Set(
    incomes
      .map(i => [i.store, i.personName])
      .flat()
      .filter(Boolean)
      .map(String)
  ));
  
  const commodities = Array.from(new Set(
    incomes
      .map(i => i.commodity)
      .filter(Boolean)
      .map(String)
  ));

  const categories = Array.from(new Set(incomes.map(i => i.category)));

  // Calculate total income for the filtered date range (only ONE_TIME incomes)
  // Note: Since we're fetching incomes filtered by date range, we should only sum ONE_TIME transactions
  // Recurring transactions should be handled differently but for now, we'll only sum ONE_TIME
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Total income in the filtered date range - ensure we're only summing valid amounts
  const totalIncome = filteredIncomes.reduce((sum, income) => {
    const amount = typeof income.amount === 'number' ? income.amount : parseFloat(String(income.amount)) || 0;
    // Only sum positive amounts (income should always be positive)
    // Also validate the amount is a reasonable number
    if (amount > 0 && !isNaN(amount) && isFinite(amount) && amount < 1000000000) {
      return sum + amount;
    }
    return sum;
  }, 0);
  
  // This month's income - only count incomes from current month
  const thisMonthIncome = filteredIncomes.reduce((sum, income) => {
    try {
      const dateStr = income.date.toString().slice(0, 10); // Ensure YYYY-MM-DD format
      const incomeDate = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
      
      if (!isNaN(incomeDate.getTime()) && incomeDate >= currentMonthStart && incomeDate <= currentMonthEnd) {
        return sum + income.amount;
      }
    } catch {
      // Skip invalid dates
    }
    return sum;
  }, 0);

  if (isFetching) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="flex space-x-3">
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="minimal-card p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Incomes List Skeleton */}
        <div className="minimal-card p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-primary">Income Management</h2>
          <p className="text-muted">Track and manage your income sources</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchIncomes}
            className="minimal-button-secondary flex items-center space-x-2"
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowFileDialog(true)}
            className="minimal-button-secondary flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Parse File</span>
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="minimal-button-secondary flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
        <button
          onClick={() => setShowForm(true)}
            className="minimal-button-primary flex items-center space-x-2"
        >
            <Plus className="w-4 h-4" />
          <span>Add Income</span>
        </button>
      </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="minimal-card-inset p-4 border-l-4 border-error">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-error" />
            <span className="text-error font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-error hover:text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="minimal-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Income</p>
              <p className="text-2xl font-bold text-success currency-inr">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="minimal-stat-inset">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="minimal-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">This Month</p>
              <p className="text-2xl font-bold text-info currency-inr">{formatCurrency(thisMonthIncome)}</p>
            </div>
            <div className="minimal-stat-inset">
              <Calendar className="w-6 h-6 text-info" />
            </div>
          </div>
        </div>

        <div className="minimal-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Sources</p>
              <p className="text-2xl font-bold text-primary">{filteredIncomes.length}</p>
            </div>
            <div className="minimal-stat-inset">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search incomes..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 minimal-input"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)}
            className="minimal-select"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={filterStore}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStore(e.target.value)}
            className="minimal-select"
          >
            <option value="all">All Stores/People</option>
            {storesPersons.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
          <select
            value={filterCommodity}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCommodity(e.target.value)}
            className="minimal-select"
          >
            <option value="all">All Commodities</option>
            {commodities.map(commodity => (
              <option key={commodity} value={commodity}>{commodity}</option>
            ))}
          </select>
          <button className="minimal-button-small p-2">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Import CSV Dialog */}
      {showImportDialog && (
        <div className="minimal-card p-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-primary">Import Income from CSV</h3>
            <button
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportError(null);
              }}
              className="minimal-button-small p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="minimal-card-inset p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-info mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-primary mb-2">How to Import:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
                    <li>Download the sample CSV template below</li>
                    <li>Fill in your income data following the format</li>
                    <li>Save the file as CSV</li>
                    <li>Select the file and click Import</li>
                    <li>Duplicates will be automatically skipped</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Download Template Button */}
            <div className="flex items-center justify-center py-4">
              <button
                onClick={downloadSampleTemplate}
                className="minimal-button-primary flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Sample Template</span>
              </button>
            </div>

            {/* File Input */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-3">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileSelect}
                className="w-full minimal-input"
              />
              {importFile && (
                <p className="text-sm text-success mt-2">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            {/* Error Display */}
            {importError && (
              <div className="minimal-card-inset p-4 border-l-4 border-error">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-error" />
                  <span className="text-error text-sm">{importError}</span>
                </div>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImportCSV}
              disabled={!importFile || isImporting}
              className="minimal-button-primary w-full flex justify-center items-center py-4 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <div className="flex items-center">
                  <div className="minimal-loading mr-2"></div>
                  Importing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* File Parse Dialog */}
      {showFileDialog && (
        <div className="minimal-card p-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-primary">Parse Financial Documents</h3>
            <button
              onClick={() => {
                setShowFileDialog(false);
                setSelectedFile(null);
                setFileError(null);
                setParsedTransactions([]);
                setShowCsvPreview(false);
              }}
              className="minimal-button-small p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="minimal-card-inset p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-info mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-primary mb-2">Supported File Formats:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted">
                    <li><strong>PDF:</strong> Bank statements, transaction reports</li>
                    <li><strong>XLS/XLSX:</strong> Excel spreadsheets with transaction data</li>
                    <li><strong>DOC/DOCX:</strong> Word documents with financial data</li>
                    <li><strong>TXT:</strong> Text files with transaction information</li>
                  </ul>
                  <p className="text-xs text-muted mt-2">
                    Duplicates will be automatically skipped during import
                  </p>
                </div>
              </div>
            </div>

            {/* File Input with Drag and Drop */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-3">
                Select File
              </label>
              <div 
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {isDragging ? 'Drop file here' : 'Drag and drop your file here, or click to browse'}
                </p>
                <input
                  type="file"
                  accept=".pdf,.xls,.xlsx,.doc,.docx,.txt"
                  onChange={handleMultiFormatFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="minimal-button-secondary cursor-pointer inline-block">
                  Choose File
                </label>
              </div>
              {selectedFile && (
                <p className="text-sm text-success mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            {/* Error Display */}
            {fileError && (
              <div className="minimal-card-inset p-4 border-l-4 border-error">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-error" />
                  <span className="text-error text-sm">{fileError}</span>
                </div>
              </div>
            )}

            {/* Bank selector and Parse Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-3">
                  Bank (optional)
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full minimal-input"
                >
                  <option value="">Auto-detect</option>
                  <option value="sbi">SBI</option>
                  <option value="hdfc">HDFC</option>
                  <option value="icici">ICICI</option>
                  <option value="axis">Axis</option>
                  <option value="bob">Bank of Baroda</option>
                  <option value="kotak">Kotak</option>
                  <option value="yes">YES Bank</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleParseFile}
                  disabled={!selectedFile || isParsingFile}
                  className="minimal-button-primary w-full flex justify-center items-center py-4 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsingFile ? (
                    <div className="flex items-center">
                      <div className="minimal-loading mr-2"></div>
                      Parsing File...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Parse File
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Dialog */}
      {showCsvPreview && (
        <div className="minimal-card p-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-primary">Review Parsed Transactions</h3>
            <button
              onClick={() => {
                setShowCsvPreview(false);
                setParsedTransactions([]);
              }}
              className="minimal-button-small p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Summary */}
            <div className="minimal-card-inset p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <div>
                  <p className="font-semibold text-primary">Found {filteredParsed.length} transactions</p>
                  <p className="text-sm text-muted">
                    Credits will be added to Income, Debits to Expenses. 
                    Zero amounts will be skipped. Duplicates will be automatically skipped.
                    Store and product information will be preserved.
                  </p>
                </div>
              </div>
              {isParsingFile && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-900 h-2 rounded-full transition-all" style={{ width: `${parseProgress}%` }}></div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Parsing... {parseProgress}%</div>
                </div>
              )}
            </div>

            {/* Split View: Raw Data (Left) and Processed Data (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Half - Raw Data */}
              <div>
                <h4 className="text-lg font-semibold text-primary mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Raw Transaction Data
                </h4>
                <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg w-full">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {filteredParsed.length} transactions found
                    </p>
                  </div>
              <div className="space-y-2 p-4">
                    {visibleParsed.map((transaction: BankTransaction, index: number) => (
                      <div key={index} className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 w-full min-w-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Transaction #{index + 1} (Raw Length: {(transaction.raw || transaction.description || '').length})
                        </div>
                        <div className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all whitespace-pre-wrap overflow-x-auto min-w-0">
                          {(() => {
                            const rawData = transaction.raw || transaction.description || 'No raw data available';
                            if (index < 3) {
                              console.log(`🔍 Raw data for transaction ${index + 1}:`, {
                                raw: transaction.raw,
                                description: transaction.description,
                                rawLength: rawData.length,
                                fullRaw: rawData,
                                rawPreview: rawData.substring(0, 200) + '...'
                              });
                            }
                            return rawData;
                          })()}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Length: {(transaction.raw || transaction.description || '').length} chars
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Half - Processed Data */}
              <div>
                <h4 className="text-lg font-semibold text-primary mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Processed Data
                </h4>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  {/* Preview filters */}
                  <div className="flex items-center justify-between mb-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={previewMonthOnly} onChange={(e)=>{ setPreviewMonthOnly(e.target.checked); setPreviewPage(1); }} />
                      Current month only
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Rows per page</span>
                      <select value={previewPageSize} onChange={(e)=>{ setPreviewPageSize(parseInt(e.target.value||'200')); setPreviewPage(1); }} className="border rounded px-1 py-0.5">
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={500}>500</option>
                      </select>
                    </div>
                  </div>
                  <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Store/Person</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Commodity</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notes</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Raw Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {visibleParsed.map((transaction: BankTransaction, index: number) => {
                        const debitAmount = parseFloat(String(transaction.debit || '0'));
                        const creditAmount = parseFloat(String(transaction.credit || '0'));
                        const isIncome = creditAmount > 0;
                        const amount = isIncome ? creditAmount : debitAmount;
                        const storeOrPerson = transaction.store || transaction.personName || '';
                        const commodity = transaction.commodity || '';
                        const notes = [storeOrPerson, commodity, transaction.remarks].filter(Boolean).join(' | ') || '';
                        
                        // Debug logging for first few transactions
                        if (index < 3) {
                          console.log(`🔍 Transaction ${index + 1} debug:`, {
                            store: storeOrPerson,
                            commodity,
                            remarks: transaction.remarks,
                            notes,
                            raw: transaction.raw,
                            description: transaction.description,
                            fullTransaction: transaction
                          });
                        }
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                              {transaction.date_iso || transaction.date || new Date().toISOString().split('T')[0]}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900 dark:text-white font-medium">
                              {storeOrPerson || '-'}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                              {commodity || '-'}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isIncome 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {isIncome ? 'Income' : 'Expense'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs font-bold">
                              <span className={isIncome ? 'text-green-600' : 'text-red-600'}>
                                {isIncome ? '+' : '-'}₹{amount.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate" title={notes}>
                              {notes || '-'}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono max-w-md">
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                  View Raw
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                                  {JSON.stringify({
                                    date: transaction.date,
                                    date_iso: transaction.date_iso,
                                    description: transaction.description,
                                    debit: transaction.debit,
                                    credit: transaction.credit,
                                    balance: transaction.balance,
                                    bankCode: transaction.bankCode,
                                    transactionId: transaction.transactionId,
                                    accountNumber: transaction.accountNumber,
                                    transferType: transaction.transferType,
                                    upiId: transaction.upiId,
                                    personName: transaction.personName,
                                    branch: transaction.branch,
                                    store: transaction.store,
                                    commodity: transaction.commodity,
                                    raw: transaction.raw
                                  }, null, 2)}
                                </pre>
                              </details>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span>Page {previewPage} of {totalPages}</span>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 border rounded disabled:opacity-50" onClick={()=> setPreviewPage(p => Math.max(1, p-1))} disabled={previewPage===1}>Prev</button>
                        <button className="px-2 py-1 border rounded disabled:opacity-50" onClick={()=> setPreviewPage(p => Math.min(totalPages, p+1))} disabled={previewPage===totalPages}>Next</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Import Button with progress */}
            <div className="space-y-3">
              {isImporting && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-900 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }}></div>
                </div>
              )}
              <button
                onClick={handleImportParsedTransactions}
                disabled={isImporting}
                className="minimal-button-primary w-full flex justify-center items-center py-4 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <div className="flex items-center gap-2">
                    <div className="minimal-loading"></div>
                    <span>Importing... {importProgress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Transactions
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Income Form */}
      {showForm && (
        <div className="minimal-card p-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-primary">{isEditMode ? 'Edit Income' : 'Add New Income'}</h3>
            <button
              onClick={resetForm}
              className="minimal-button-small p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title Field */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-primary mb-3">
                  Income Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="minimal-input"
                  placeholder="e.g., Salary, Freelance Project"
                />
              </div>

              {/* Category Field */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-primary mb-3">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="minimal-select"
                >
                  <option value="">Select a category</option>
                  <option value="Salary">Salary</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Investment">Investment</option>
                  <option value="Rental">Rental</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Business">Business</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Amount Field */}
              <div>
                <label htmlFor="amount" className="block text-sm font-semibold text-primary mb-3">
                  Amount (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Date Field */}
              <div>
                <label htmlFor="date" className="block text-sm font-semibold text-primary mb-3">
                  Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                  />
                </div>
              </div>

              {/* Payment Method Field */}
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-semibold text-primary mb-3">
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="minimal-select"
                >
                  <option value="">Select payment method</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Auto Credit">Auto Credit</option>
                  <option value="Online Payment">Online Payment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-primary mb-3">
                Description
              </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                className="minimal-textarea"
                  placeholder="Optional description..."
                />
            </div>

            {/* Notes Field */}
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-primary mb-3">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                className="minimal-textarea"
                placeholder="Additional notes..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="minimal-button-primary w-full flex justify-center items-center py-4 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="minimal-loading mr-2"></div>
                  {isEditMode ? 'Updating Income...' : 'Adding Income...'}
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Update Income' : 'Add Income'}
                </div>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Incomes List */}
      <div className="minimal-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary">Your Income Sources</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted">{filteredIncomes.length} incomes</span>
            <button className="minimal-button-small p-2">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {filteredIncomes.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-muted text-lg font-medium mb-2">No incomes found</p>
            <p className="text-muted">Try adjusting your search or filters</p>
            <button
              onClick={() => setShowForm(true)}
              className="minimal-button-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Income
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIncomes.map((income) => (
              <div key={income.id} className="minimal-card-inset p-4 hover-lift transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                  <div className="minimal-stat-inset p-2">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-primary">{income.title}</h4>
                        <span className="minimal-badge minimal-badge-success">{income.category}</span>
                  </div>
                      <div className="flex items-center space-x-4 text-sm text-muted mb-2">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {(() => {
                              try {
                                const dateStr = income.date.toString().slice(0, 10);
                                const date = new Date(dateStr + 'T00:00:00');
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleDateString('en-IN', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  });
                                }
                                return dateStr; // Fallback to ISO format string
                              } catch {
                                return income.date.toString().slice(0, 10);
                              }
                            })()}
                          </span>
                        </span>
                        {income.paymentMethod && (
                          <span className="flex items-center space-x-1">
                            <CreditCard className="w-3 h-3" />
                            <span>{income.paymentMethod}</span>
                          </span>
                        )}
                        </div>
                      {income.description && (
                        <p className="text-sm text-muted mb-2">{income.description}</p>
                      )}
                      {income.notes && (
                        <p className="text-xs text-muted">Note: {income.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                <div className="text-right">
                  <p className="font-semibold text-success currency-inr">{formatCurrency(income.amount)}</p>
                </div>
                  <button
                    onClick={() => handleEdit(income)}
                    className="minimal-button-small p-2 text-primary hover:bg-primary hover:text-white transition-all"
                    title="Edit income"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(income.id)}
                    className="minimal-button-small p-2 text-error hover:bg-error hover:text-white transition-all"
                      title="Delete income"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
