import { prisma } from '@/lib/db';
import type { UserDocumentSummary } from '@/types/documents';
import type { UserPreferencesPayload } from '@/features/settings/types';

interface LoadDocumentsParams {
  userId: string;
  includePortal?: boolean;
}

export async function loadUserDocuments(params: LoadDocumentsParams): Promise<UserDocumentSummary[]> {
  const includePortal = params.includePortal ?? true;
  const portalVisibilities = ['ORGANIZATION', 'PUBLIC'] as const;

  try {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { ownerId: params.userId },
          ...(includePortal ? [{ visibility: { in: [...portalVisibilities] } }] : []),
        ],
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return documents.map((doc) => ({
      id: doc.id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      visibility: doc.visibility as UserDocumentSummary['visibility'],
      sourceType: doc.sourceType as UserDocumentSummary['sourceType'],
      ownerId: doc.ownerId,
      uploadedById: doc.uploadedById,
      bankCode: doc.bankCode,
      parsedAt: doc.parsedAt?.toISOString() ?? null,
      transactionCount: doc._count.transactions,
    }));
  } catch (error) {
    console.error('[settings] failed to load documents', { userId: params.userId, error });
    throw error;
  }
}

export async function loadUserPreferences(userId: string): Promise<UserPreferencesPayload | null> {
  try {
    const preferences = await (prisma as any).userPreferences.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!preferences) {
      return {
        navigationLayout: 'sidebar',
        theme: 'system',
        colorScheme: 'default',
      };
    }

    return preferences as UserPreferencesPayload;
  } catch (error) {
    console.error('[settings] failed to load user preferences', { userId, error });
    throw error;
  }
}
