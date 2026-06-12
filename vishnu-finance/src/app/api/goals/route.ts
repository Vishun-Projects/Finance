import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { prisma } from '../../../lib/db';
import { addImageGenerationJob } from '@/lib/services/image-queue';
import { ImageJobType } from '@prisma/client';
import { withAuth } from '@/lib/api-auth';
import { rejectForeignUserId } from '@/lib/api-user-scope';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const forbidden = rejectForeignUserId(user, searchParams.get('userId'));
    if (forbidden) return forbidden;

    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      include: { contributions: { orderBy: { date: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('GOALS GET - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  // ... (POST remains largely the same, usually we don't add contributions on create but we could if needed)
  // For brevity, keeping POST as is, mainly focused on updates.
  try {
    const body = await request.json();
    const forbidden = rejectForeignUserId(user, body.userId);
    if (forbidden) return forbidden;

    const {
      title,
      targetAmount,
      currentAmount,
      targetDate,
      priority,
      category,
      description,
    } = body;

    if (!title || !targetAmount) {
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
        userId: user.id,
        isActive: true,
      },
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
    invalidateUserAppData(user.id);
    return NextResponse.json(newGoal);
  } catch (error) {
    console.error('GOALS POST - Error:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { id, contributionAmount, contributionSource, contributionNote, ...rawUpdate } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const owned = await prisma.goal.findFirst({ where: { id, userId: user.id } });
    if (!owned) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const updateData = {
      title: rawUpdate.title,
      targetAmount: rawUpdate.targetAmount ? parseFloat(rawUpdate.targetAmount) : undefined,
      currentAmount: rawUpdate.currentAmount ? parseFloat(rawUpdate.currentAmount) : undefined,
      targetDate: rawUpdate.targetDate ? new Date(rawUpdate.targetDate) : undefined,
      priority: rawUpdate.priority,
      category: rawUpdate.category,
      description: rawUpdate.description,
      isActive: rawUpdate.isActive,
    };

    let updatedGoal;

    if (contributionAmount) {
      const amount = parseFloat(contributionAmount);
      updatedGoal = await prisma.$transaction(async (tx) => {
        await tx.goalContribution.create({
          data: {
            goalId: id,
            amount,
            source: contributionSource || 'Other',
            note: contributionNote,
            date: new Date(),
          },
        });

        const newTotal = updateData.currentAmount;
        return tx.goal.update({
          where: { id },
          data: {
            ...updateData,
            currentAmount: newTotal,
            updatedAt: new Date(),
          },
          include: { contributions: { orderBy: { date: 'desc' } } },
        });
      });
    } else {
      updatedGoal = await prisma.goal.update({
        where: { id },
        data: { ...updateData, updatedAt: new Date() },
        include: { contributions: { orderBy: { date: 'desc' } } },
      });
    }

    if (updateData.title && updateData.title !== owned.title) {
      try {
        const prompt = `A professional, high-quality, high-resolution photography of ${updateData.title}, financial goal achievement, wealth, success, photorealistic, 16:9 aspect ratio`;
        await addImageGenerationJob(id, ImageJobType.GOAL, prompt);
      } catch (imageErr) {
        console.error('Goal Image - Failed to queue generation:', imageErr);
      }
    }

    revalidatePath('/');
    revalidatePath('/plans');
    invalidateUserAppData(user.id);
    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('GOALS PUT - Error:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const deleted = await prisma.goal.deleteMany({
      where: { id, userId: user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    revalidatePath('/');
    revalidatePath('/plans');
    invalidateUserAppData(user.id);
    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('GOALS DELETE - Error:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
});
