'use server';

import fs from 'fs';
import path from 'path';

export async function fetchAndSaveGoalImage(query: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
        if (!query) return { success: false, error: 'Query is required' };

        // Use Pollinations.ai for generative images (no API key needed, minimalist style)
        // We add "minimalist, flat design, illustration" to match the wireframe vibe
        const prompt = encodeURIComponent(`${query} minimalist flat design vector illustration dark mode`);
        const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=600&nologo=true`;

        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'goals');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${crypto.randomUUID()}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, buffer);

        return { success: true, path: `/uploads/goals/${fileName}` };
    } catch (error) {
        console.error('Error fetching goal image:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
