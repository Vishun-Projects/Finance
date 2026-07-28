import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { computeNetWorth, EMPTY_NET_WORTH } from '@/lib/net-worth-service';
import { AssetType, LiabilityType } from '@prisma/client';

export const GET = withAuth(async (_request, user) => {
  try {
    const breakdown = await computeNetWorth(user.id);
    return NextResponse.json(breakdown);
  } catch (error) {
    console.error('[net-worth] load failed', { userId: user.id, error });
    return NextResponse.json(EMPTY_NET_WORTH);
  }
});

export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { kind, name, type, amount, notes } = body as {
    kind: 'asset' | 'liability';
    name: string;
    type?: string;
    amount: number;
    notes?: string;
  };

  if (!name?.trim() || typeof amount !== 'number' || amount < 0) {
    return NextResponse.json({ error: 'Invalid name or amount' }, { status: 400 });
  }

  if (kind === 'asset') {
    const asset = await prisma.userAsset.create({
      data: {
        userId: user.id,
        name: name.trim(),
        type: (type as AssetType) ?? AssetType.OTHER,
        value: amount,
        notes: notes?.trim() || null,
      },
    });
    return NextResponse.json({ asset });
  }

  const liability = await prisma.userLiability.create({
    data: {
      userId: user.id,
      name: name.trim(),
      type: (type as LiabilityType) ?? LiabilityType.OTHER,
      balance: amount,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json({ liability });
});

export const DELETE = withAuth(async (request, user) => {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const kind = searchParams.get('kind');
  if (!id || (kind !== 'asset' && kind !== 'liability')) {
    return NextResponse.json({ error: 'id and kind required' }, { status: 400 });
  }

  if (kind === 'asset') {
    await prisma.userAsset.deleteMany({ where: { id, userId: user.id } });
  } else {
    await prisma.userLiability.deleteMany({ where: { id, userId: user.id } });
  }
  return NextResponse.json({ success: true });
});
