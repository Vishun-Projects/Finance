import { prisma } from '@/lib/db';

type EntityType = 'PERSON' | 'STORE';

/**
 * Resolve a canonical name for a single mapped entity.
 */
export async function getCanonicalName(
  userId: string,
  name: string,
  entityType: EntityType,
): Promise<string> {
  if (!name || !name.trim()) {
    return name;
  }

  const result = await getCanonicalNamesBatch(userId, [name], [entityType]);
  return result[name] ?? name;
}

/**
 * Resolve canonical names for multiple mapped entities in a single fetch.
 */
export async function getCanonicalNamesBatch(
  userId: string,
  names: string[],
  entityTypes: EntityType[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  if (!names?.length) {
    return result;
  }

  try {
    let mappings: Array<{
      canonicalName: string;
      mappedNames: string | null;
      entityType: EntityType;
    }> = [];

    try {
      mappings = await prisma.entityMapping.findMany({
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
    } catch {
      try {
        const placeholders = entityTypes.map(() => '?').join(',');
        const sqlResult = await prisma.$queryRawUnsafe<
          Array<{ canonicalName: string; mappedNames: string | null; entityType: EntityType }>
        >(
          `SELECT canonicalName, mappedNames, entityType FROM entity_mappings WHERE userId = ? AND entityType IN (${placeholders})`,
          userId,
          ...entityTypes,
        );
        mappings = Array.isArray(sqlResult) ? sqlResult : [];
      } catch {
        console.warn(
          '⚠️ Entity mappings table does not exist. Returning original names. Run migrations to enable entity mapping feature.',
        );
        names.forEach(name => {
          result[name] = name;
        });
        return result;
      }
    }

    const nameToCanonical = new Map<string, string>();

    for (const mapping of mappings) {
      const mappedNames = JSON.parse(mapping.mappedNames ?? '[]') as string[];
      const canonical = mapping.canonicalName;
      const entityType = mapping.entityType;

      nameToCanonical.set(`${canonical.toLowerCase().trim()}:${entityType}`, canonical);

      for (const mappedName of mappedNames) {
        nameToCanonical.set(`${mappedName.toLowerCase().trim()}:${entityType}`, canonical);
      }
    }

    for (const name of names) {
      if (!name || !name.trim()) {
        result[name] = name;
        continue;
      }

      let resolved = false;
      for (const entityType of entityTypes) {
        const key = `${name.toLowerCase().trim()}:${entityType}`;
        const canonical = nameToCanonical.get(key);
        if (canonical) {
          result[name] = canonical;
          resolved = true;
          break;
        }
      }

      if (!resolved) {
        result[name] = name;
      }
    }

    return result;
  } catch (error) {
    console.warn(
      '⚠️ Error resolving canonical names batch:',
      error instanceof Error ? error.message : error,
    );
    names.forEach(name => {
      result[name] = name;
    });
    return result;
  }
}




