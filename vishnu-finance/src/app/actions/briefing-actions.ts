'use server';

import { BriefingService } from '@/services/briefing-service';
import { revalidatePath } from 'next/cache';

export async function generateBriefingAction(dateStr: string) {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return { success: false, error: "Invalid date" };
        }

        const briefing = await BriefingService.generate(date);

        if (!briefing) {
            return { success: false, error: "Failed to generate briefing. Please try again." };
        }

        revalidatePath(`/education/daily-news/${dateStr}`);
        revalidatePath(`/education/daily-news/history`);
        return { success: true };
    } catch (error) {
        console.error("Action Error:", error);
        return { success: false, error: "Server error occurred." };
    }
}
