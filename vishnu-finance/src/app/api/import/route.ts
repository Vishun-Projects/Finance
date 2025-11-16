import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { getCanonicalName } from '@/lib/entity-mapping-service';
import {
	getOrCreateAccountStatement,
	validateOpeningBalance,
	checkStatementContinuity,
	type StatementMetadata,
} from '@/lib/account-statement';
import { relative } from 'path';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';
import { validateBalanceReconciliation, formatValidationResult } from '@/lib/balance-validator';
import { categorizeTransactions, detectAutoPayTransactions } from '@/lib/transaction-categorization-service';

interface ImportRecord {
	title?: string;
	amount?: number | string;
	debit?: number | string;
	credit?: number | string;
	category?: string;
	date?: string;
	date_iso?: string;
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
	raw?: string;
	rawData?: string;
	balance?: number | string;
	isPartialData?: boolean;
	hasInvalidDate?: boolean;
	hasZeroAmount?: boolean;
	parsingMethod?: string;
	parsingConfidence?: number;
}

export async function POST(request: NextRequest) {
	console.log('🏦 Import Bank Statement API: Starting request');

	try {
		const body = await request.json();
		const {
			userId,
			records,
			metadata,
			document,
			useAICategorization = true,
			validateBalance = true,
			categorizeInBackground = false,
			forceInsert = false,
		} = body as {
			userId: string;
			records: ImportRecord[];
			metadata?: StatementMetadata;
			document?: {
				storageKey?: string;
				originalName?: string;
				mimeType?: string;
				fileSize?: number;
				checksum?: string;
			};
			useAICategorization?: boolean;
			validateBalance?: boolean;
			categorizeInBackground?: boolean;
			forceInsert?: boolean;
		};

		console.log(`📋 Categorization settings: useAICategorization=${useAICategorization}, categorizeInBackground=${categorizeInBackground}, records=${records.length}`);

		if (!userId || !Array.isArray(records)) {
			return NextResponse.json({ error: 'userId and records are required' }, { status: 400 });
		}

		const authToken = request.cookies.get('auth-token');
		const actorRecord = authToken ? ((await AuthService.getUserFromToken(authToken.value)) as any) : null;
		const actorRole = (actorRecord as { role?: 'USER' | 'SUPERUSER' } | null)?.role;

		if (!actorRecord || !actorRecord.isActive || (actorRole !== 'SUPERUSER' && actorRecord.id !== userId)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (records.length === 0) {
			return NextResponse.json({ inserted: 0, skipped: 0, duplicates: 0, incomeInserted: 0, expenseInserted: 0 });
		}

		const firstRecord = records[0];
		const accountNumber = firstRecord.accountNumber || null;
		const bankCode = firstRecord.bankCode || null;

		let balanceValidation: any = null;
		let accountStatement: any = null;
		const warnings: string[] = [];
		const errors: string[] = [];

		if (metadata && accountNumber && bankCode && metadata.openingBalance !== null) {
			try {
				balanceValidation = await validateOpeningBalance(userId, accountNumber, bankCode, metadata.openingBalance);
				if (balanceValidation.error) errors.push(balanceValidation.error);
				else if (balanceValidation.warning) warnings.push(balanceValidation.warning);

				if (metadata.statementStartDate) {
					const continuity = await checkStatementContinuity(userId, accountNumber, bankCode, new Date(metadata.statementStartDate));
					if (continuity.hasGap && continuity.gapDays > 0) {
						warnings.push(`Gap of ${continuity.gapDays} day(s) detected between statements. Last statement ended on ${continuity.lastEndDate?.toLocaleDateString()}. This may indicate missing statements.`);
					}
				}

				if (balanceValidation.isValid || balanceValidation.isFirstImport) {
					const totalDebits = records.reduce((sum, r) => sum + Number(r.debit || 0), 0);
					const totalCredits = records.reduce((sum, r) => sum + Number(r.credit || 0), 0);

					const enrichedMetadata: StatementMetadata = {
						...metadata,
						totalDebits,
						totalCredits,
						transactionCount: records.length,
						bankCode,
					};

					accountStatement = await getOrCreateAccountStatement(userId, accountNumber, bankCode, enrichedMetadata);
					if (accountStatement) console.log(`✅ Account statement stored: ${accountStatement.id}`);
				}
			} catch (error: any) {
				console.error('Error processing account statement:', error);
				warnings.push(`Failed to store account statement metadata: ${error.message}`);
			}
		}

		const parseDate = (dateInput: string | Date | null | undefined): Date | null => {
			if (!dateInput) return null;
			try {
				let date: Date;
				if (dateInput instanceof Date) {
					date = dateInput;
				} else {
					const dateStr = dateInput.toString().trim();
					if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
						date = new Date(dateStr + 'T00:00:00');
					} else {
						date = new Date(dateStr);
					}
				}
				if (isNaN(date.getTime())) return null;
				const year = date.getFullYear();
				if (year < 2010 || year > 2030) return null;
				return date;
			} catch {
				return null;
			}
		};

		const statementStartDate = metadata?.statementStartDate ? new Date(metadata.statementStartDate) : null;
		let lastValidDate: Date | null = null;

		const normalized = records
			.map((r, idx) => {
				const dateInput = (r.date_iso || r.date) as string | Date | null | undefined;
				let parsedDate = parseDate(dateInput);
				let hasInvalidDate = false;
				if (!parsedDate || isNaN(parsedDate.getTime())) {
					if (lastValidDate) {
						parsedDate = new Date(lastValidDate);
						hasInvalidDate = true;
					} else if (statementStartDate) {
						parsedDate = new Date(statementStartDate);
						hasInvalidDate = true;
					} else {
						parsedDate = new Date();
						hasInvalidDate = true;
					}
				}
				if (parsedDate && !isNaN(parsedDate.getTime())) lastValidDate = parsedDate;

				let debitAmount = Math.max(0, Number(r.debit || 0));
				let creditAmount = Math.max(0, Number(r.credit || 0));

				if (debitAmount === 0 && creditAmount === 0) {
					const amount = Number(r.amount || 0);
					if (r.type === 'income' || (!r.type && amount > 0)) {
						creditAmount = Math.abs(amount);
						debitAmount = 0;
					} else if (r.type === 'expense' || (!r.type && amount < 0)) {
						debitAmount = Math.abs(amount);
						creditAmount = 0;
					} else {
						if (amount > 0) {
							creditAmount = amount;
							debitAmount = 0;
						} else if (amount < 0) {
							debitAmount = Math.abs(amount);
							creditAmount = 0;
						}
					}
				}

				debitAmount = Math.max(0, debitAmount);
				creditAmount = Math.max(0, creditAmount);
				const hasZeroAmount = debitAmount === 0 && creditAmount === 0;

				let financialCategory: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER' = 'EXPENSE';
				if (creditAmount > 0) financialCategory = 'INCOME';
				else if (debitAmount > 0) financialCategory = 'EXPENSE';

				const descriptionUpper = ((r.title || r.description || '').toString().toUpperCase());
				const isNEFT = descriptionUpper.includes('NEFT') || descriptionUpper.includes('RTGS') || descriptionUpper.includes('IMPS');
				if (creditAmount > 0 && isNEFT) {
					financialCategory = 'INCOME';
				} else if (r.transferType && (r.transferType.toLowerCase().includes('transfer') || r.transferType.toLowerCase().includes('neft') || r.transferType.toLowerCase().includes('rtgs') || r.transferType.toLowerCase().includes('imps')) && creditAmount === 0 && debitAmount > 0) {
					financialCategory = 'TRANSFER';
				}

				let description = (r.title || r.description || '').toString().trim();
				const isPartialData = !description || hasZeroAmount || hasInvalidDate;
				if (!description) {
					description = (r.raw || r.rawData || '').toString().trim();
					if (!description) description = 'Uncategorized Transaction';
				}

				return {
					description,
					transactionDate: parsedDate!,
					creditAmount,
					debitAmount,
					financialCategory,
					category: (r.category || '').toString().trim() || null,
					notes: (r.notes || '').toString().trim() || null,
					bankCode: r.bankCode || null,
					transactionId: r.transactionId || null,
					accountNumber: r.accountNumber || null,
					transferType: r.transferType || null,
					personName: r.personName || null,
					upiId: r.upiId || null,
					branch: r.branch || null,
					store: r.store || null,
					balance: r.balance ? Number(r.balance) : null,
					rawData: r.raw || r.rawData || null,
					isPartialData,
					hasInvalidDate,
					hasZeroAmount,
					parsingMethod: r.parsingMethod || 'standard',
					parsingConfidence: r.parsingConfidence || (isPartialData ? 0.5 : 1.0),
				};
			})
			.filter((r, idx) => {
				if (!r.transactionDate || isNaN(r.transactionDate.getTime())) return false;
				return true;
			});

		const normalizedCount = normalized.length;
		const filteredCount = records.length - normalizedCount;
		if (filteredCount > 0) {
			console.log(`📊 Normalization: ${records.length} records → ${normalizedCount} valid (${filteredCount} filtered)`);
		}

		if (userId && normalized.length > 0) {
			for (const record of normalized) {
				if (record.personName) record.personName = await getCanonicalName(userId, record.personName, 'PERSON');
				if (record.store) record.store = await getCanonicalName(userId, record.store, 'STORE');
			}
		}

		if (normalized.length === 0) {
			return NextResponse.json({ error: 'No valid records to import' }, { status: 400 });
		}

		let balanceValidationResult: any = null;
		if (validateBalance && metadata) {
			try {
				balanceValidationResult = validateBalanceReconciliation(
					metadata,
					normalized.map(r => ({ creditAmount: r.creditAmount, debitAmount: r.debitAmount, balance: r.balance }))
				);
				if (balanceValidationResult.errors.length > 0) errors.push(...balanceValidationResult.errors);
				if (balanceValidationResult.warnings.length > 0) warnings.push(...balanceValidationResult.warnings);
				if (!balanceValidationResult.accountNumberValid) warnings.push(...balanceValidationResult.accountNumberIssues);
			} catch (error: any) {
				console.error('Error validating balance:', error);
				warnings.push(`Balance validation failed: ${error.message}`);
			}
		}

		const seen = new Set<string>();
		const duplicateKeys = new Set<string>();
		let invalidDateCount = 0;
		const unique = normalized.filter((r) => {
			if (!r.transactionDate || isNaN(r.transactionDate.getTime())) {
				invalidDateCount++;
				return false;
			}
			let dateStr = '';
			try {
				dateStr = r.transactionDate.toISOString().slice(0, 10);
			} catch {
				invalidDateCount++;
				return false;
			}
			const key = `${r.description}|${r.creditAmount}|${r.debitAmount}|${dateStr}`;
			if (seen.has(key)) {
				duplicateKeys.add(key);
				return false;
			}
			seen.add(key);
			return true;
		});

		const duplicateCount = normalized.length - unique.length - invalidDateCount;
		if (duplicateCount > 0 || invalidDateCount > 0) {
			console.log(`📊 Deduplication: ${normalized.length} normalized → ${unique.length} unique (${duplicateCount} duplicates in file, ${invalidDateCount} invalid dates)`);
		}

		let inserted = 0;
		let duplicates = 0;
		let creditInserted = 0;
		let debitInserted = 0;

		const rangeFor = (recs: typeof unique) => {
			if (!recs.length) return null;
			const validDates = recs.map(r => r.transactionDate).filter((d): d is Date => d !== null && !isNaN(d.getTime()));
			if (!validDates.length) return null;
			const timestamps = validDates.map(d => d.getTime());
			const min = new Date(Math.min(...timestamps));
			const max = new Date(Math.max(...timestamps));
			return { min, max };
		};

		const range = rangeFor(unique);
		let existing: any[] = [];
		let existingSet = new Set<string>();

		if (!forceInsert) {
			try {
				await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
				const totalCount = await (prisma as any).transaction.count({ where: { userId, isDeleted: false } });
				if (totalCount === 0) {
					console.log('✅ Database is empty for this user, skipping duplicate check');
				} else {
					const expandedRange = range ? {
						gte: new Date(range.min.getTime() - 30 * 24 * 60 * 60 * 1000),
						lte: new Date(range.max.getTime() + 30 * 24 * 60 * 60 * 1000),
					} : undefined;
					existing = await (prisma as any).transaction.findMany({
						where: { userId, isDeleted: false, ...(expandedRange ? { transactionDate: expandedRange } : {}) },
						select: { id: true, description: true, creditAmount: true, debitAmount: true, transactionDate: true, transactionId: true, accountNumber: true },
					});
					existingSet = new Set(
						existing.map((e: any) => {
							try {
								const date = new Date(e.transactionDate);
								if (isNaN(date.getTime())) return null;
								const desc = (e.description || '').substring(0, 50);
								const txnId = (e.transactionId || '').trim();
								const accNum = (e.accountNumber || '').trim();
								const key = `${userId}|${desc}|${Number(e.creditAmount)}|${Number(e.debitAmount)}|${date.toISOString().slice(0,10)}|${txnId}|${accNum}|${e.isDeleted || false}`;
								return key;
							} catch {
								return null;
							}
						}).filter((k: string | null): k is string => k !== null)
					);
				}
			} catch (error: any) {
				console.log('⚠️ Transaction table not available, skipping duplicate check', error);
				existing = [];
			}
		} else {
			console.log('⚡ Force insert mode: Skipping duplicate check');
		}

		const toInsert = unique.filter(r => {
			if (!r.transactionDate || isNaN(r.transactionDate.getTime())) return false;
			if (forceInsert) return true;
			try {
				const desc = (r.description || '').substring(0, 50);
				const txnId = (r.transactionId || '').trim();
				const accNum = (r.accountNumber || '').trim();
				const key = `${userId}|${desc}|${r.creditAmount}|${r.debitAmount}|${r.transactionDate.toISOString().slice(0,10)}|${txnId}|${accNum}|false`;
				const isDuplicate = existingSet.has(key);
				if (isDuplicate) {
					console.log(`🔍 Duplicate detected: ${desc.substring(0, 30)}... (${r.transactionDate.toISOString().slice(0,10)}, ${r.creditAmount > 0 ? `+${r.creditAmount}` : `-${r.debitAmount}`})`);
				}
				return !isDuplicate;
			} catch {
				return false;
			}
		});

		const existingDuplicates = unique.length - toInsert.length;
		duplicates += existingDuplicates;

		console.log(`📊 Import summary: ${records.length} total records → ${normalized.length} normalized → ${unique.length} unique → ${toInsert.length} to insert`);

		if (toInsert.length) {
			try {
				await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
			} catch (error: any) {
				console.log('⚠️ Transaction table not available, falling back to Expense/IncomeSource', error);
				return NextResponse.json({ success: false, error: 'Transaction table not migrated yet. Please run Prisma migration first.', fallback: true }, { status: 400 });
			}

			const batchSize = toInsert.length > 5000 ? 2000 : toInsert.length > 1000 ? 1000 : 500;
			const chunks: typeof toInsert[] = [];
			for (let i = 0; i < toInsert.length; i += batchSize) {
				chunks.push(toInsert.slice(i, i + batchSize));
			}

			console.log(`📦 Processing ${toInsert.length} transactions in ${chunks.length} batches of ${batchSize}`);
			const CONCURRENT_BATCHES = 5;

			const processBatch = async (chunk: typeof toInsert, batchNum: number): Promise<{ inserted: number; credit: number; debit: number }> => {
				try {
					const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
					const values = chunk.map((r, idx) => {
						const id = `'${Date.now()}_${batchNum}_${idx}_${Math.random().toString(36).substr(2, 9)}'`;
						if (!r.transactionDate) throw new Error('Transaction date is required');
						const date = `'${r.transactionDate.toISOString().split('T')[0]}'`;
						const desc = (r.description || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 500);
						const credit = r.creditAmount || 0;
						const debit = r.debitAmount || 0;
						const categoryId = (r as any).categoryId ? `'${String((r as any).categoryId).replace(/'/g, "''")}'` : 'NULL';
						const notes = formatNotes(r) ? `'${formatNotes(r).replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 2000)}'` : 'NULL';
						const personName = r.personName ? `'${(r.personName || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 200)}'` : 'NULL';
						const store = r.store ? `'${(r.store || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 200)}'` : 'NULL';
						const rawData = r.rawData ? `'${(r.rawData || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 5000)}'` : 'NULL';
						const bankCode = r.bankCode ? `'${(r.bankCode || '').replace(/'/g, "''")}'` : 'NULL';
						const transactionId = r.transactionId ? `'${(r.transactionId || '').replace(/'/g, "''")}'` : 'NULL';
						const accountNumber = r.accountNumber ? `'${(r.accountNumber || '').replace(/'/g, "''")}'` : 'NULL';
						const transferType = r.transferType ? `'${(r.transferType || '').replace(/'/g, "''")}'` : 'NULL';
						const upiId = r.upiId ? `'${(r.upiId || '').replace(/'/g, "''")}'` : 'NULL';
						const branch = r.branch ? `'${(r.branch || '').replace(/'/g, "''")}'` : 'NULL';
						const balance = r.balance !== null && r.balance !== undefined ? Number(r.balance) : 'NULL';
						const accountStatementId = accountStatement?.id ? `'${accountStatement.id}'` : 'NULL';
						const receiptUrl = document ? `'${(`/api/user/documents/${document?.storageKey ?? ''}/download`).replace(/'/g, "''")}'` : 'NULL';
						const documentId = 'NULL';
						const isPartialData = (r as any).isPartialData ? 1 : 0;
						const hasInvalidDate = (r as any).hasInvalidDate ? 1 : 0;
						const hasZeroAmount = (r as any).hasZeroAmount ? 1 : 0;
						const parsingMethod = (r as any).parsingMethod ? `'${String((r as any).parsingMethod).replace(/'/g, "''")}'` : 'NULL';
						const parsingConfidence = (r as any).parsingConfidence !== null && (r as any).parsingConfidence !== undefined ? Number((r as any).parsingConfidence) : 'NULL';
						return `(${id},'${userId}',${date},'${desc}',${credit},${debit},'${r.financialCategory}',${categoryId},${accountStatementId},${bankCode},${transactionId},${accountNumber},${transferType},${personName},${upiId},${branch},${store},${rawData},${balance},${notes},${receiptUrl},0,${isPartialData},${hasInvalidDate},${hasZeroAmount},${parsingMethod},${parsingConfidence},'${now}','${now}',${documentId})`;
					}).join(',');
					await (prisma as any).$executeRawUnsafe(`
            INSERT IGNORE INTO transactions 
            (id, userId, transactionDate, description, creditAmount, debitAmount, financialCategory, categoryId, accountStatementId, bankCode, transactionId, accountNumber, transferType, personName, upiId, branch, store, rawData, balance, notes, receiptUrl, isDeleted, isPartialData, hasInvalidDate, hasZeroAmount, parsingMethod, parsingConfidence, createdAt, updatedAt, documentId)
            VALUES ${values}
          `);
					let batchCredit = 0;
					let batchDebit = 0;
					for (const r of chunk) {
						if (r.creditAmount > 0) batchCredit++;
						if (r.debitAmount > 0) batchDebit++;
					}
					return { inserted: chunk.length, credit: batchCredit, debit: batchDebit };
				} catch (error: any) {
					console.error(`❌ Batch ${batchNum} error:`, error.message);
					try {
						const data = chunk.map(r => ({
							userId,
							transactionDate: r.transactionDate,
							description: r.description,
							creditAmount: r.creditAmount,
							debitAmount: r.debitAmount,
							financialCategory: r.financialCategory,
							categoryId: (r as any).categoryId || null,
							accountStatementId: accountStatement?.id || null,
							notes: formatNotes(r),
							bankCode: r.bankCode || null,
							transactionId: r.transactionId || null,
							accountNumber: r.accountNumber || null,
							transferType: r.transferType || null,
							personName: r.personName || null,
							upiId: r.upiId || null,
							branch: r.branch || null,
							store: r.store || null,
							balance: r.balance || null,
							rawData: r.rawData || null,
							documentId: null,
							receiptUrl: null,
							isPartialData: (r as any).isPartialData || false,
							hasInvalidDate: (r as any).hasInvalidDate || false,
							hasZeroAmount: (r as any).hasZeroAmount || false,
							parsingMethod: (r as any).parsingMethod || null,
							parsingConfidence: (r as any).parsingConfidence || null,
						}));
						const result = await (prisma as any).transaction.createMany({ data, skipDuplicates: true });
						let batchCredit = 0;
						let batchDebit = 0;
						for (const r of chunk) {
							if (r.creditAmount > 0) batchCredit++;
							if (r.debitAmount > 0) batchDebit++;
						}
						return { inserted: result.count, credit: batchCredit, debit: batchDebit };
					} catch (fallbackError: any) {
						console.error(`❌ Batch ${batchNum} fallback also failed:`, fallbackError.message);
						return { inserted: 0, credit: 0, debit: 0 };
					}
				}
			};

			const processBatchesInParallel = async () => {
				const results: Array<{ inserted: number; credit: number; debit: number }> = [];
				for (let i = 0; i < chunks.length; i += CONCURRENT_BATCHES) {
					const batchGroup = chunks.slice(i, i + CONCURRENT_BATCHES);
					const batchPromises = batchGroup.map((chunk, idx) => processBatch(chunk, i + idx + 1));
					const batchResults = await Promise.all(batchPromises);
					results.push(...batchResults);
					for (const result of batchResults) {
						inserted += result.inserted;
						creditInserted += result.credit;
						debitInserted += result.debit;
					}
					console.log(`✅ Processed batches ${i + 1}-${Math.min(i + CONCURRENT_BATCHES, chunks.length)}/${chunks.length}`);
				}
				return results;
			};

			await processBatchesInParallel();

			const dbDuplicates = Math.max(0, toInsert.length - inserted);
			if (dbDuplicates > 0 && dbDuplicates !== existingDuplicates) {
				console.log(`📊 Additional duplicates caught by INSERT IGNORE: ${dbDuplicates - existingDuplicates}`);
			}
		}

		console.log(`✅ Import Bank Statement: ${inserted} transactions inserted (${creditInserted} credits, ${debitInserted} debits), ${duplicates} duplicates`);

		const meta = extractRequestMeta(request);
		await writeAuditLog({
			actorId: actorRecord.id,
			event: 'TRANSACTION_IMPORT',
			severity: duplicates > 0 ? 'WARN' : 'INFO',
			targetUserId: userId,
			targetResource: undefined,
			metadata: { inserted, duplicates, creditInserted, debitInserted, bankCode, accountNumber },
			message: `${actorRecord.email} imported ${inserted} transactions${duplicates ? ` (${duplicates} duplicates)` : ''}`,
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
		});

		let backgroundJobStarted = false;
		let insertedTransactionIds: string[] = [];
		const earlierShouldUseBackground = categorizeInBackground || (normalized.length > 100 && useAICategorization) || (normalized.length > 50 && useAICategorization);
		const finalShouldUseBackground = categorizeInBackground || (inserted > 100 && useAICategorization) || (inserted > 50 && useAICategorization && normalized.length > 50) || earlierShouldUseBackground;

		if (finalShouldUseBackground && inserted > 0) {
			try {
				console.log(`🔍 Fetching transaction IDs for background categorization...`);
				const timeWindow = new Date(Date.now() - 300000);
				let recentTransactions = await prisma.transaction.findMany({
					where: { userId, isDeleted: false, createdAt: { gte: timeWindow }, ...(accountStatement?.id ? { accountStatementId: accountStatement.id } : {}) },
					select: { id: true },
					take: inserted * 2,
					orderBy: { createdAt: 'desc' },
				});
				if (recentTransactions.length === 0 && accountStatement?.id) {
					console.log(`⚠️ No transactions found with accountStatementId, trying without it...`);
					recentTransactions = await prisma.transaction.findMany({
						where: { userId, isDeleted: false, createdAt: { gte: timeWindow } },
						select: { id: true },
						take: inserted * 2,
						orderBy: { createdAt: 'desc' },
					});
				}
				insertedTransactionIds = recentTransactions.map(t => t.id);
				console.log(`📊 Found ${insertedTransactionIds.length} transaction IDs (expected: ${inserted})`);
				if (insertedTransactionIds.length > 0) {
					const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
					const authToken = request.cookies.get('auth-token');
					const headers: Record<string, string> = { 'Content-Type': 'application/json' };
					if (authToken) headers['Cookie'] = `auth-token=${authToken.value}`;
					console.log(`🚀 Starting background categorization for ${insertedTransactionIds.length} transactions via ${baseUrl}...`);
					fetch(`${baseUrl}/api/transactions?action=categorize-background`, {
						method: 'POST',
						headers,
						body: JSON.stringify({ userId, transactionIds: insertedTransactionIds, batchSize: 100 }),
					})
						.then(async (response) => {
							if (response.ok) {
								const result = await response.json().catch(() => ({}));
								console.log(`✅ Background categorization job started successfully:`, result);
								backgroundJobStarted = true;
							} else {
								const errorText = await response.text().catch(() => 'Unknown error');
								console.error(`❌ Background categorization failed: ${response.status} ${response.statusText} - ${errorText}`);
							}
						})
						.catch((error) => {
							console.error('❌ Failed to trigger background categorization:', error);
						});
				}
			} catch (error) {
				console.error('❌ Error starting background categorization:', error);
			}
		}

		return NextResponse.json({
			inserted,
			skipped: unique.length - inserted,
			duplicates,
			creditInserted,
			debitInserted,
			incomeInserted: creditInserted,
			expenseInserted: debitInserted,
		});
	} catch (error: any) {
		console.error('❌ IMPORT BANK STATEMENT ERROR:', error);
		console.error('❌ ERROR STACK:', error?.stack);
		const errorMessage = error?.message || 'Failed to import bank statements';
	 return NextResponse.json({ error: errorMessage, details: process.env.NODE_ENV === 'development' ? error?.stack : undefined }, { status: 500 });
	}
}

function formatNotes(record: any): string {
	if (record.commodity) return record.commodity;
	if (record.description) return record.description;
	return '';
}


