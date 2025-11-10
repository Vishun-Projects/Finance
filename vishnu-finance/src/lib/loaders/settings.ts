
import { serverFetch, ServerFetchError } from '@/lib/server-fetch';
import type { UserDocumentSummary } from '@/types/documents';
import type { UserPreferencesPayload } from '@/types/settings';

interface LoadDocumentsParams {
  includePortal?: boolean;
}

interface DocumentsResponse {
  documents?: UserDocumentSummary[];
}

export async function loadUserDocuments(params: LoadDocumentsParams = {}): Promise<UserDocumentSummary[]> {
  const includePortal = params.includePortal ?? true;
  try {
    const data = await serverFetch<DocumentsResponse>(`/api/user/documents?includePortal=${includePortal ? 'true' : 'false'}`, {
      cache: 'no-store',
      description: 'user-documents',
      revalidate: 0,
    });
    return data?.documents ?? [];
  } catch (error) {
    if (error instanceof ServerFetchError && error.status === 404) {
      return [];
    }
    console.error('[settings] failed to load documents', error);
    return [];
  }
}

export async function loadUserPreferences(userId: string): Promise<UserPreferencesPayload | null> {
  try {
    const data = await serverFetch<UserPreferencesPayload | null>(`/api/user-preferences?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
      description: 'user-preferences',
      revalidate: 0,
    });
    if (!data) {
      return null;
    }
    return data;
  } catch (error) {
    if (error instanceof ServerFetchError && error.status === 404) {
      return null;
    }
    console.error('[settings] failed to load user preferences', error);
    return null;
  }
}
