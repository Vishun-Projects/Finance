import { Prisma } from '@prisma/client';
import { prisma } from './db';

export type AuditEvent =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_OAUTH_LOGIN'
  | 'USER_OAUTH_REGISTER'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_STATUS_CHANGE'
  | 'SUPER_DOCUMENT_UPLOAD'
  | 'SUPER_DOCUMENT_UPDATE'
  | 'SUPER_DOCUMENT_DELETE'
  | 'BANK_MAPPING_CREATE'
  | 'BANK_MAPPING_UPDATE'
  | 'BANK_MAPPING_DELETE'
  | 'USER_STATUS_CHANGE'
  | 'USER_ROLE_CHANGE'
  | 'PREFERENCE_UPDATE'
  | 'TRANSACTION_IMPORT'
  | 'TRANSACTION_DELETE'
  | 'TRANSACTION_RESTORE'
  | 'ADMIN_ACTION';

export type AuditSeverity = 'INFO' | 'WARN' | 'ALERT';

export interface AuditContext {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditPayload {
  actorId: string;
  event: AuditEvent;
  severity?: AuditSeverity;
  targetUserId?: string;
  targetResource?: string;
  metadata?: Prisma.JsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
  message?: string;
}

export function extractRequestMeta(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent') || null;
  return { ipAddress, userAgent };
}

export async function writeAuditLog(payload: AuditPayload) {
  const {
    actorId,
    event,
    severity = 'INFO',
    targetUserId,
    targetResource,
    metadata,
    ipAddress,
    userAgent,
    message,
  } = payload;

  try {
    const prismaWithAudit = prisma as unknown as {
      auditLog?: {
        create?: (...args: any[]) => Promise<unknown>;
      };
    };

    if (!prismaWithAudit.auditLog || typeof prismaWithAudit.auditLog.create !== 'function') {
      console.warn('⚠️ Audit log table not available yet. Skipping audit write.');
      return;
    }

    await prismaWithAudit.auditLog.create({
      data: {
        actorId,
        event,
        severity,
        targetUserId,
        targetResource,
        metadata,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        message: message || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export function getAuditContextFromRequest(request: Request): AuditContext {
  const meta = extractRequestMeta(request);
  return {
    userId: '',
    ipAddress: meta.ipAddress || undefined,
    userAgent: meta.userAgent || undefined,
  };
}

