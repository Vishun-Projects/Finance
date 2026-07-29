import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { prisma } from '@/lib/db';
import { getCanonicalName } from '@/lib/entity-mapping-service';

export const dynamic = 'force-dynamic';

type SuggestInput = {
  personName?: string | null;
  store?: string | null;
  description?: string | null;
  smsId?: string | null;
};

type SuggestResult = {
  smsId?: string | null;
  bucket: 'known' | 'new' | 'conflict';
  entityType: 'person' | 'store' | null;
  displayName: string | null;
  canonicalName: string | null;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  categories: Array<{ categoryId: string; categoryName: string; count: number }>;
};

function buildPayeeKey(personName?: string | null, store?: string | null): {
  key: string | null;
  entityType: 'person' | 'store' | null;
  displayName: string | null;
} {
  const storeTrim = store?.trim();
  if (storeTrim) {
    return { key: `store:${storeTrim.toLowerCase()}`, entityType: 'store', displayName: storeTrim };
  }
  const personTrim = personName?.trim();
  if (personTrim) {
    return { key: `person:${personTrim.toLowerCase()}`, entityType: 'person', displayName: personTrim };
  }
  return { key: null, entityType: null, displayName: null };
}

async function suggestOne(userId: string, input: SuggestInput): Promise<SuggestResult> {
  const { key, entityType, displayName } = buildPayeeKey(input.personName, input.store);

  if (!key || !entityType || !displayName) {
    return {
      smsId: input.smsId ?? null,
      bucket: 'new',
      entityType: null,
      displayName: null,
      canonicalName: null,
      suggestedCategoryId: null,
      suggestedCategoryName: null,
      categories: [],
    };
  }

  const canonicalName = await getCanonicalName(
    userId,
    displayName,
    entityType === 'store' ? 'STORE' : 'PERSON',
  );

  const orConditions: object[] =
    entityType === 'store'
      ? [
          { store: { equals: canonicalName, mode: 'insensitive' as const } },
          { store: { equals: displayName, mode: 'insensitive' as const } },
        ]
      : [
          { personName: { equals: canonicalName, mode: 'insensitive' as const } },
          { personName: { equals: displayName, mode: 'insensitive' as const } },
        ];

  // Also search by raw name in description (handles UPI IDs stored in SMS body)
  if (displayName.includes('@') || displayName.match(/\d{5,}/)) {
    orConditions.push(
      { description: { contains: displayName, mode: 'insensitive' as const } },
    );
  }
  // If canonical differs from display, also search by canonical in personName
  if (canonicalName.toLowerCase() !== displayName.toLowerCase()) {
    orConditions.push(
      { personName: { equals: displayName, mode: 'insensitive' as const } },
    );
  }

  const existing = await prisma.transaction.findMany({
    where: { userId, isDeleted: false, OR: orConditions },
    select: {
      categoryId: true,
      personName: true,
      category: { select: { id: true, name: true } },
    },
    take: 80,
    orderBy: { transactionDate: 'desc' },
  });

  const history = new Map<string, { id: string; name: string; count: number }>();
  let resolvedName = canonicalName;
  for (const row of existing) {
    if (!row.category) continue;
    const prev = history.get(row.category.id);
    if (prev) prev.count++;
    else history.set(row.category.id, { id: row.category.id, name: row.category.name, count: 1 });
    // Prefer a human-readable name from existing transactions over the raw UPI ID
    if (
      row.personName &&
      !row.personName.includes('@') &&
      resolvedName === canonicalName &&
      canonicalName === displayName
    ) {
      resolvedName = row.personName;
    }
  }

  if (history.size === 0) {
    return {
      smsId: input.smsId ?? null,
      bucket: 'new',
      entityType,
      displayName,
      canonicalName: resolvedName,
      suggestedCategoryId: null,
      suggestedCategoryName: null,
      categories: [],
    };
  }

  const categories = Array.from(history.values())
    .map((c) => ({ categoryId: c.id, categoryName: c.name, count: c.count }))
    .sort((a, b) => b.count - a.count);

  const bucket = categories.length === 1 ? 'known' : 'conflict';

  return {
    smsId: input.smsId ?? null,
    bucket,
    entityType,
    displayName,
    canonicalName: resolvedName,
    suggestedCategoryId: categories[0].categoryId,
    suggestedCategoryName: categories[0].categoryName,
    categories,
  };
}

/** POST body: { drafts: SuggestInput[] } or a single SuggestInput */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const drafts: SuggestInput[] = Array.isArray(body?.drafts)
      ? body.drafts
      : body
        ? [body]
        : [];

    if (drafts.length === 0) {
      return NextResponse.json({ error: 'No drafts provided' }, { status: 400 });
    }
    if (drafts.length > 50) {
      return NextResponse.json({ error: 'Max 50 drafts per request' }, { status: 400 });
    }

    // Parallelize independent suggestions (avoid waterfall)
    const suggestions = await Promise.all(drafts.map((d) => suggestOne(user.id, d)));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[sms-transactions/suggest] failed', error);
    return NextResponse.json({ error: 'Failed to suggest categories' }, { status: 500 });
  }
}
