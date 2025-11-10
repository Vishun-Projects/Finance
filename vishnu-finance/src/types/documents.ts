
export type DocumentVisibility = 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
export type DocumentSourceType = 'USER_UPLOAD' | 'BANK_STATEMENT' | 'PORTAL_RESOURCE' | 'SYSTEM';

export interface UserDocumentSummary {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize?: number | null;
  createdAt: string;
  updatedAt: string;
  visibility: DocumentVisibility;
  sourceType: DocumentSourceType;
  ownerId?: string | null;
  uploadedById: string;
  bankCode?: string | null;
  transactionCount: number;
}
