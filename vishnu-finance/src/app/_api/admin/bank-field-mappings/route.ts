import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

const requireSuperuser = async (request: NextRequest) => {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  const user = (await AuthService.getUserFromToken(token.value)) as any;
  if (!user || !user.isActive || user.role !== 'SUPERUSER') return null;
  return user;
};

const transformMapping = (mapping: any) => ({
  id: mapping.id,
  bankCode: mapping.bankCode,
  fieldKey: mapping.fieldKey,
  mappedTo: mapping.mappedTo,
  description: mapping.description,
  version: mapping.version,
  isActive: mapping.isActive,
  mappingConfig: mapping.mappingConfig,
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

export async function GET(request: NextRequest) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const bankCode = searchParams.get('bankCode');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const mappings = await prisma.bankFieldMapping.findMany({
      where: {
        bankCode: bankCode || undefined,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [
        { bankCode: 'asc' },
        { version: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json({
      mappings: mappings.map(transformMapping),
    });
  } catch (error) {
    console.error('Failed to load bank field mappings:', error);
    return NextResponse.json(
      { error: 'Failed to load mappings' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bankCode, fieldKey, mappedTo, description, version, isActive, mappingConfig } =
      body || {};

    if (!bankCode || !fieldKey || !mappedTo) {
      return NextResponse.json(
        { error: 'bankCode, fieldKey, and mappedTo are required' },
        { status: 400 },
      );
    }

    const created = await prisma.bankFieldMapping.create({
      data: {
        bankCode,
        fieldKey,
        mappedTo,
        description: description || null,
        version: Number.isFinite(version) ? version : 1,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        mappingConfig: mappingConfig ?? Prisma.DbNull,
        createdById: superuser.id,
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
      event: 'BANK_MAPPING_CREATE',
      severity: 'INFO',
      targetResource: `mapping:${created.id}`,
      metadata: {
        bankCode,
        fieldKey,
        mappedTo,
      },
      message: `Created mapping ${bankCode}/${fieldKey}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json(
      { mapping: transformMapping(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create bank field mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create mapping' },
      { status: 500 },
    );
  }
}

