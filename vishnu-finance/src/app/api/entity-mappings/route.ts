import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

