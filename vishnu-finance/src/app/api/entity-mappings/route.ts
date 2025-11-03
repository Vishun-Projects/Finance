import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to resolve canonical name (single)
export async function getCanonicalName(
  userId: string,
  name: string,
  entityType: 'PERSON' | 'STORE'
): Promise<string> {
  if (!name || !name.trim()) return name;

  const results = await getCanonicalNamesBatch(userId, [name], [entityType]);
  return results[name] || name;
}

// PERFORMANCE OPTIMIZATION: Batch version to eliminate N+1 queries
// Fetches all mappings once and resolves multiple names in memory
export async function getCanonicalNamesBatch(
  userId: string,
  names: string[],
  entityTypes: ('PERSON' | 'STORE')[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  
  // Return early if no names to process
  if (!names || names.length === 0) return result;

  try {
    // Fetch ALL entity mappings for user once (not per name)
    let mappings: any[] = [];
    try {
      // First try Prisma Client
      mappings = await (prisma as any).entityMapping.findMany({
        where: {
          userId,
          entityType: { in: entityTypes },
        },
        select: {
          canonicalName: true,
          mappedNames: true,
          entityType: true,
        },
      });
    } catch (prismaError: any) {
      // If Prisma fails, try raw SQL
      try {
        const placeholders = entityTypes.map(() => '?').join(',');
        const sqlResult = await (prisma as any).$queryRawUnsafe(
          `SELECT canonicalName, mappedNames, entityType FROM entity_mappings WHERE userId = ? AND entityType IN (${placeholders})`,
          userId,
          ...entityTypes
        );
        mappings = Array.isArray(sqlResult) ? sqlResult : [];
      } catch (sqlError: any) {
        // If table doesn't exist, gracefully return original names
        console.warn('⚠️ Entity mappings table does not exist. Returning original names. Run migrations to enable entity mapping feature.');
        names.forEach(name => {
          result[name] = name;
        });
        return result;
      }
    }

    // Build lookup maps for fast in-memory resolution
    const nameToCanonical: Map<string, string> = new Map();
    
    for (const mapping of mappings) {
      const mappedNames = JSON.parse(mapping.mappedNames || '[]');
      const canonical = mapping.canonicalName;
      const entityType = mapping.entityType;
      
      // Add canonical name itself
      nameToCanonical.set(`${canonical.toLowerCase().trim()}:${entityType}`, canonical);
      
      // Add all mapped names
      for (const mappedName of mappedNames) {
        nameToCanonical.set(`${mappedName.toLowerCase().trim()}:${entityType}`, canonical);
      }
    }

    // Resolve all names using the lookup map
    for (const name of names) {
      if (!name || !name.trim()) {
        result[name] = name;
        continue;
      }

      // Try each entity type
      let resolved = false;
      for (const entityType of entityTypes) {
        const key = `${name.toLowerCase().trim()}:${entityType}`;
        if (nameToCanonical.has(key)) {
          result[name] = nameToCanonical.get(key)!;
          resolved = true;
          break;
        }
      }
      
      // Return original if no mapping found
      if (!resolved) {
        result[name] = name;
      }
    }

    return result;
  } catch (error) {
    // Gracefully handle any errors - return original names
    console.warn('⚠️ Error resolving canonical names batch:', error instanceof Error ? error.message : error);
    console.warn('⚠️ Returning original names without mapping.');
    // Return original names on error (graceful degradation)
    names.forEach(name => {
      result[name] = name;
    });
    return result;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entityType = searchParams.get('type') as 'PERSON' | 'STORE' | null;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const where: any = { userId };
    if (entityType) {
      where.entityType = entityType;
    }

    const mappings = await (prisma as any).entityMapping.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse mappedNames JSON
    const parsedMappings = mappings.map((m: any) => ({
      ...m,
      mappedNames: JSON.parse(m.mappedNames || '[]'),
    }));

    return NextResponse.json(parsedMappings);
  } catch (error) {
    console.error('Error fetching entity mappings:', error);
    return NextResponse.json({ error: 'Failed to fetch entity mappings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, canonicalName, mappedNames, entityType } = body;

    if (!userId || !canonicalName || !entityType) {
      return NextResponse.json(
        { error: 'userId, canonicalName, and entityType are required' },
        { status: 400 }
      );
    }

    // Validate entityType
    if (!['PERSON', 'STORE'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
    }

    // Ensure mappedNames is an array
    const namesArray = Array.isArray(mappedNames) ? mappedNames : [mappedNames].filter(Boolean);

    // Check for existing mapping with same canonical name and entityType
    const existing = await (prisma as any).entityMapping.findFirst({
      where: {
        userId,
        canonicalName: canonicalName.trim(),
        entityType,
      },
    });

    let mapping;
    if (existing) {
      // Update existing mapping, merge mapped names
      const existingNames = JSON.parse(existing.mappedNames || '[]');
      const mergedNames = Array.from(new Set([...existingNames, ...namesArray]));
      
      mapping = await (prisma as any).entityMapping.update({
        where: { id: existing.id },
        data: {
          mappedNames: JSON.stringify(mergedNames),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new mapping
      mapping = await (prisma as any).entityMapping.create({
        data: {
          userId,
          canonicalName: canonicalName.trim(),
          mappedNames: JSON.stringify(namesArray),
          entityType,
        },
      });
    }

    return NextResponse.json({
      ...mapping,
      mappedNames: JSON.parse(mapping.mappedNames || '[]'),
    });
  } catch (error) {
    console.error('Error creating entity mapping:', error);
    return NextResponse.json({ error: 'Failed to create entity mapping' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, canonicalName, mappedNames } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (canonicalName) {
      updateData.canonicalName = canonicalName.trim();
    }
    if (mappedNames !== undefined) {
      const namesArray = Array.isArray(mappedNames) ? mappedNames : [mappedNames].filter(Boolean);
      updateData.mappedNames = JSON.stringify(namesArray);
    }

    const mapping = await (prisma as any).entityMapping.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...mapping,
      mappedNames: JSON.parse(mapping.mappedNames || '[]'),
    });
  } catch (error) {
    console.error('Error updating entity mapping:', error);
    return NextResponse.json({ error: 'Failed to update entity mapping' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await (prisma as any).entityMapping.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Entity mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting entity mapping:', error);
    return NextResponse.json({ error: 'Failed to delete entity mapping' }, { status: 500 });
  }
}

