import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: NextRequest) {
  console.log('🔍 WISHLIST GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('🔍 WISHLIST GET - User ID:', userId);

    if (!userId) {
      console.log('❌ WISHLIST GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 WISHLIST GET - Fetching from database for user:', userId);
    // Fetch wishlist items from database
    const wishlistItems = await (prisma as any).wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Parse tags from JSON strings to arrays
    const processedItems = wishlistItems.map((item: any) => ({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : []
    }));

    console.log('✅ WISHLIST GET - Found wishlist items:', processedItems.length, 'records');
    console.log('📊 WISHLIST GET - Wishlist data:', JSON.stringify(processedItems, null, 2));
    return NextResponse.json(processedItems);
  } catch (error) {
    console.error('❌ WISHLIST GET - Error:', error);
    console.error('❌ WISHLIST GET - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch wishlist items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('➕ WISHLIST POST - Starting request');
  try {
    const body = await request.json();
    console.log('➕ WISHLIST POST - Request body:', JSON.stringify(body, null, 2));
    
    const {
      title,
      description,
      estimatedCost,
      priority,
      category,
      targetDate,
      notes,
      tags,
      userId
    } = body;

    console.log('➕ WISHLIST POST - Extracted data:', {
      title,
      description,
      estimatedCost,
      priority,
      category,
      targetDate,
      notes,
      tags,
      userId
    });

    // Validate required fields
    if (!title || !estimatedCost || !userId) {
      console.log('❌ WISHLIST POST - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('➕ WISHLIST POST - Creating wishlist item in database...');
    // Create new wishlist item in database
    const newWishlistItem = await (prisma as any).wishlistItem.create({
      data: {
        title,
        description: description || null,
        estimatedCost: parseFloat(estimatedCost),
        priority: priority || 'MEDIUM',
        category: category || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        notes: notes || null,
        tags: tags ? JSON.stringify(tags) : null,
        userId: userId,
        isCompleted: false
      }
    });

    console.log('✅ WISHLIST POST - Successfully created wishlist item:', JSON.stringify(newWishlistItem, null, 2));
    return NextResponse.json(newWishlistItem);
  } catch (error) {
    console.error('❌ WISHLIST POST - Error:', error);
    console.error('❌ WISHLIST POST - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create wishlist item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.log('✏️ WISHLIST PUT - Starting request');
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    console.log('✏️ WISHLIST PUT - Update data:', JSON.stringify({ id, ...updateData }, null, 2));

    if (!id) {
      console.log('❌ WISHLIST PUT - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('✏️ WISHLIST PUT - Updating wishlist item in database...');
    // Update wishlist item in database
    const updatedWishlistItem = await (prisma as any).wishlistItem.update({
      where: { id },
      data: {
        ...updateData,
        estimatedCost: updateData.estimatedCost ? parseFloat(updateData.estimatedCost) : undefined,
        targetDate: updateData.targetDate ? new Date(updateData.targetDate) : undefined,
        tags: updateData.tags ? JSON.stringify(updateData.tags) : undefined,
        updatedAt: new Date()
      }
    });

    console.log('✅ WISHLIST PUT - Successfully updated wishlist item:', JSON.stringify(updatedWishlistItem, null, 2));
    return NextResponse.json(updatedWishlistItem);
  } catch (error) {
    console.error('❌ WISHLIST PUT - Error:', error);
    console.error('❌ WISHLIST PUT - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to update wishlist item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ WISHLIST DELETE - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🗑️ WISHLIST DELETE - ID to delete:', id);

    if (!id) {
      console.log('❌ WISHLIST DELETE - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('🗑️ WISHLIST DELETE - Deleting from database...');
    // Delete from database
    await (prisma as any).wishlistItem.delete({
      where: { id }
    });

    console.log('✅ WISHLIST DELETE - Successfully deleted wishlist item');
    return NextResponse.json({ message: 'Wishlist item deleted successfully' });
  } catch (error) {
    console.error('❌ WISHLIST DELETE - Error:', error);
    console.error('❌ WISHLIST DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete wishlist item' }, { status: 500 });
  }
}
