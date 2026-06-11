import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { prisma } from '../../../lib/db';
import { addImageGenerationJob } from '@/lib/services/image-queue';
import { ImageJobType } from '@prisma/client';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache for now

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch goals from database
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: { contributions: { orderBy: { date: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });

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
  try {
    const body = await request.json();

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
    } catch (imageErr) {
      console.error('⚠️ Goal Image - Failed to queue generation:', imageErr);
    }

    revalidatePath('/');
    revalidatePath('/plans');
    invalidateUserAppData(userId);
    return NextResponse.json(newGoal);
  } catch (error) {
    console.error('❌ GOALS POST - Error:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, contributionAmount, contributionSource, contributionNote, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    let updatedGoal;

    // specific handling for adding funds with source tracking
    if (contributionAmount) {
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
        } catch (imageErr) {
          console.error('⚠️ Goal Image - Failed to queue generation:', imageErr);
        }
      }
    }

    revalidatePath('/');
    revalidatePath('/plans');
    const uid = updateData.userId ?? updatedGoal?.userId;
    if (uid) invalidateUserAppData(uid);
    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('❌ GOALS PUT - Error:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Delete from database
    const existing = await prisma.goal.findUnique({ where: { id }, select: { userId: true } });
    await prisma.goal.delete({
      where: { id }
    });

    revalidatePath('/');
    revalidatePath('/plans');
    if (existing?.userId) invalidateUserAppData(existing.userId);
    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('❌ GOALS DELETE - Error:', error);
    console.error('❌ GOALS DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
