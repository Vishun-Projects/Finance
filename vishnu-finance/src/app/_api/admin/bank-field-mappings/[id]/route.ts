import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

type AuthenticatedUser = NonNullable<
  Awaited<ReturnType<typeof AuthService.getUserFromToken>>
>;

type MappingWithAuthor = Prisma.BankFieldMappingGetPayload<{
  include: {
    createdBy: {
      select: {
        id: true;
        email: true;
        name: true;
      };
    };
  };
}>;

type MappingUpdatePayload = Partial<{
  fieldKey: string;
  mappedTo: string;
  description: string | null;
  isActive: boolean;
  version: number;
  mappingConfig: Record<string, unknown> | null;
}>;

const parseMappingConfig = (
  value: string | null | undefined,
): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const requireSuperuser = async (
  request: NextRequest,
): Promise<AuthenticatedUser | null> => {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }

  const user = await AuthService.getUserFromToken(token.value);
  if (!user) {
    return null;
  }

  if (!user.isActive || user.role !== 'SUPERUSER') {
    return null;
  }

  return user;
};

const transformMapping = (mapping: MappingWithAuthor) => ({
  id: mapping.id,
  bankCode: mapping.bankCode,
  fieldKey: mapping.fieldKey,
  mappedTo: mapping.mappedTo,
  description: mapping.description,
  version: mapping.version,
  isActive: mapping.isActive,
  mappingConfig: parseMappingConfig(mapping.mappingConfig),
  createdById: mapping.createdById,
  createdAt: mapping.createdAt,
  updatedAt: mapping.updatedAt,
  createdBy: mapping.createdBy
    ? {
        id: mapping.createdBy.id,
        email: mapping.createdBy.email,
        name: mapping.createdBy.name,
      }
    : null,
});

type RouteParams = { id: string };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const body = (await request.json()) as MappingUpdatePayload | null | undefined;
    const { fieldKey, mappedTo, description, isActive, version, mappingConfig } =
      body || {};

    const updated = await prisma.bankFieldMapping.update({
      where: { id },
      data: {
        fieldKey: fieldKey ?? undefined,
        mappedTo: mappedTo ?? undefined,
        description: description ?? undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
        version: Number.isFinite(version) ? version : undefined,
        mappingConfig:
          mappingConfig === undefined
            ? undefined
            : mappingConfig === null
              ? null
              : JSON.stringify(mappingConfig),
      },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: superuser.id,
      event: 'BANK_MAPPING_UPDATE',
      severity: isActive === false ? 'WARN' : 'INFO',
      targetResource: `mapping:${updated.id}`,
      metadata: {
        bankCode: updated.bankCode,
        fieldKey: updated.fieldKey,
        isActive: updated.isActive,
      },
      message: `Updated mapping ${updated.bankCode}/${updated.fieldKey}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      mapping: transformMapping(updated),
    });
  } catch (error) {
    console.error('Failed to update bank field mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update mapping' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const mapping = await prisma.bankFieldMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    await prisma.bankFieldMapping.delete({
      where: { id },
    });

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: superuser.id,
      event: 'BANK_MAPPING_DELETE',
      severity: 'WARN',
      targetResource: `mapping:${id}`,
      message: `Deleted mapping ${mapping.bankCode}/${mapping.fieldKey}`,
      metadata: {
        bankCode: mapping.bankCode,
        fieldKey: mapping.fieldKey,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete bank field mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 },
    );
  }
}

