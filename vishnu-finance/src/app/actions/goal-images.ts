'use server';

import fs from 'fs';
import path from 'path';
import { generatePollinationsImage } from '@/lib/image-utils';

export async function fetchAndSaveGoalImage(query: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
        if (!query) return { success: false, error: 'Query is required' };

        const savedPath = await generatePollinationsImage(query, 'uploads/goals');
        return { success: true, path: savedPath };
    } catch (error) {
        console.error('Error fetching goal image:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
