import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '../../../lib/db';
import { addImageGenerationJob } from '@/lib/services/image-queue';
import { ImageJobType } from '@prisma/client';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache for now

export async function GET(request: NextRequest) {
  console.log('🔍 GOALS GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('🔍 GOALS GET - User ID:', userId);

    if (!userId) {
      console.log('❌ GOALS GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 GOALS GET - Fetching from database for user:', userId);
    // Fetch goals from database
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: { contributions: { orderBy: { date: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ GOALS GET - Found goals:', goals.length, 'records');
    // console.log('📊 GOALS GET - Goals data:', JSON.stringify(goals, null, 2));
    return NextResponse.json(goals);
  } catch (error) {
    console.error('❌ GOALS GET - Error:', error);
    // console.error('❌ GOALS GET - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // ... (POST remains largely the same, usually we don't add contributions on create but we could if needed)
  // For brevity, keeping POST as is, mainly focused on updates.
  console.log('➕ GOALS POST - Starting request');
  try {
    const body = await request.json();
    console.log('➕ GOALS POST - Request body:', JSON.stringify(body, null, 2));

    // ... (rest of POST implementation unchanged)
    const {
      title,
      targetAmount,
      currentAmount,
      targetDate,
      priority,
      category,
      description,
      userId
    } = body;

    if (!title || !targetAmount || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newGoal = await prisma.goal.create({
      data: {
        title,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount || '0'),
        targetDate: targetDate ? new Date(targetDate) : null,
        priority: priority || 'MEDIUM',
        category: category || null,
        description: description || null,
        userId: userId,
        isActive: true
      }
    });

    // Trigger AI image generation for the new goal
    try {
      const prompt = `A professional, high-end, Cinematic photography of ${title}, representing financial success and luxury, 8k resolution, photorealistic, cinematic lighting, minimalist aesthetic, 16:9 aspect ratio`;
      await addImageGenerationJob(newGoal.id, ImageJobType.GOAL, prompt);
      console.log(`🎨 Goal Image - Queued generation for: "${title}" (ID: ${newGoal.id})`);
    } catch (imageErr) {
      console.error('⚠️ Goal Image - Failed to queue generation:', imageErr);
    }

    revalidatePath('/');
    revalidatePath('/plans');
    return NextResponse.json(newGoal);
  } catch (error) {
    console.error('❌ GOALS POST - Error:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.log('✏️ GOALS PUT - Starting request');
  try {
    const body = await request.json();
    const { id, contributionAmount, contributionSource, contributionNote, ...updateData } = body;
    console.log('✏️ GOALS PUT - Update data:', JSON.stringify({ id, contributionAmount, ...updateData }, null, 2));

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    let updatedGoal;

    // specific handling for adding funds with source tracking
    if (contributionAmount) {
      console.log('✏️ GOALS PUT - processing contribution:', contributionAmount);
      const amount = parseFloat(contributionAmount);

      // Transaction to ensure both contribution record and balance update happen
      updatedGoal = await prisma.$transaction(async (tx) => {
        // 1. Create contribution record
        await tx.goalContribution.create({
          data: {
            goalId: id,
            amount: amount,
            source: contributionSource || 'Other',
            note: contributionNote,
            date: new Date()
          }
        });

        // 2. Update goal balance
        // We use the passed currentAmount as the NEW total if provided, or calculate it.
        // Ideally, we should increment atomically, but since we receive currentAmount usually, let's respect the logic.
        // If currentAmount is provided in updateData, we use that. 
        // If NOT provided, we increment the existing (but that needs a fetch).
        // The frontend logic (MatteGoalCard) currently calculates new total and sends it as currentAmount.
        // Let's defer to the frontend's explicit new total if present, or just use the contribution amount.

        // Actually, safest is to use the explicit currentAmount from body if present
        const newTotal = updateData.currentAmount ? parseFloat(updateData.currentAmount) : undefined;

        return await tx.goal.update({
          where: { id },
          data: {
            ...updateData,
            // If currentAmount is passed, use it. Otherwise increment (feature enhancement) -> but for now standard update
            currentAmount: newTotal,
            targetAmount: updateData.targetAmount ? parseFloat(updateData.targetAmount) : undefined,
            targetDate: updateData.targetDate ? new Date(updateData.targetDate) : undefined,
            updatedAt: new Date()
          },
          include: { contributions: { orderBy: { date: 'desc' } } }
        });

        // Trigger AI image generation if title changed
        if (updateData.title && updateData.title !== updatedGoal.title) {
          try {
            const prompt = `A professional, high-quality, high-resolution photography of ${updateData.title}, financial goal achievement, wealth, success, photorealistic, 16:9 aspect ratio`;
            await addImageGenerationJob(id, ImageJobType.GOAL, prompt);
            console.log(`🎨 Goal Image - Re-queued generation for updated title: "${updateData.title}"`);
          } catch (imageErr) {
            console.error('⚠️ Goal Image - Failed to queue generation:', imageErr);
          }
        }

        return updatedGoal;
      });
    } else {
      // Standard update without contribution record
      updatedGoal = await prisma.goal.update({
        where: { id },
        data: {
          ...updateData,
          targetAmount: updateData.targetAmount ? parseFloat(updateData.targetAmount) : undefined,
          currentAmount: updateData.currentAmount ? parseFloat(updateData.currentAmount) : undefined,
          targetDate: updateData.targetDate ? new Date(updateData.targetDate) : undefined,
          updatedAt: new Date()
        },
        include: { contributions: { orderBy: { date: 'desc' } } }
      });

      // Trigger AI image generation if title changed
      if (updateData.title && updateData.title !== updatedGoal.title) {
        try {
          const prompt = `A professional, high-quality, high-resolution photography of ${updateData.title}, financial goal achievement, wealth, success, photorealistic, 16:9 aspect ratio`;
          await addImageGenerationJob(id, ImageJobType.GOAL, prompt);
          console.log(`🎨 Goal Image - Re-queued generation for updated title: "${updateData.title}"`);
        } catch (imageErr) {
          console.error('⚠️ Goal Image - Failed to queue generation:', imageErr);
        }
      }
    }

    console.log('✅ GOALS PUT - Successfully updated goal:', { id: updatedGoal.id, currentAmount: updatedGoal.currentAmount });
    revalidatePath('/');
    revalidatePath('/plans');
    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('❌ GOALS PUT - Error:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ GOALS DELETE - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🗑️ GOALS DELETE - ID to delete:', id);

    if (!id) {
      console.log('❌ GOALS DELETE - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('🗑️ GOALS DELETE - Deleting from database...');
    // Delete from database
    await prisma.goal.delete({
      where: { id }
    });

    console.log('✅ GOALS DELETE - Successfully deleted goal');
    revalidatePath('/');
    revalidatePath('/plans');
    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('❌ GOALS DELETE - Error:', error);
    console.error('❌ GOALS DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
