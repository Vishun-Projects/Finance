'use server';

import fs from 'fs';
import path from 'path';
import { generateAndSaveImagenImage } from '@/lib/imagen';
import { prisma as db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function fetchAndSaveGoalImage(goalId: string, title: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
        if (!goalId || !title) return { success: false, error: 'Goal ID and Title are required' };

        console.log(`🎨 [AI Image] Manual generation for goal: "${title}" (${goalId})`);

        // Strict prompt for Imagen 3
        const prompt = `A professional, high-quality, high-resolution photography of ${title}, financial goal achievement, wealth, success, photorealistic, 16:9 aspect ratio`;

        // Use Gemini Imagen 3 exclusively
        const savedPath = await generateAndSaveImagenImage(prompt, 'uploads/goals');

        if (!savedPath) {
            console.error(`❌ [AI Image] Gemini failed to generate image for "${title}"`);
            return { success: false, error: 'AI generation failed. Please try again later.' };
        }

        // Persist to database
        await db.goal.update({
            where: { id: goalId },
            data: { imageUrl: savedPath }
        });

        // Invalidate cache
        revalidatePath('/');
        revalidatePath('/plans');

        console.log(`✅ [AI Image] Successfully saved Gemini image to: ${savedPath}`);
        return { success: true, path: savedPath };
    } catch (error) {
        console.error('Error fetching goal image:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
