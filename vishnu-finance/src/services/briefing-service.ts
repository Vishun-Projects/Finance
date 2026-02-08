import { prisma } from '@/lib/db';
import { searchInternet } from '@/lib/search';
import { genAI, retryWithBackoff, generateImage } from '@/lib/gemini';
import { downloadAndSaveImage, generatePollinationsImage } from '@/lib/image-utils';
import { addImageGenerationJob } from '@/lib/services/image-queue';
import { ImageJobType } from '@prisma/client';

export class BriefingService {

    /**
     * Get existing briefing from DB only.
     */
    static async get(date: Date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await prisma.dailyBriefing.findFirst({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        if (existing) {
            return { ...existing, source: 'database' };
        }
        return null;
    }

    /**
     * Generate a new briefing for a specific date.
     */
    static async generate(date: Date, location: string = 'India') {
        return await this.generateBriefing(date, location);
    }

    /**
     * Get existing or generate. (Legacy/Auto mode)
     */
    static async getOrGenerate(date: Date, location: string = 'India') {
        const existing = await this.get(date);
        if (existing) return existing;

        // Validation
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) return null;

        return await this.generateBriefing(date, location);
    }

    private static async generateBriefing(date: Date, location: string) {
        try {
            console.log(`[BriefingService] Generating for ${date.toDateString()} in ${location}`);

            // Format date for search query
            const dateString = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

            // Search Query
            const query = `major financial news ${location} ${dateString} market wrap`; // Specific date query
            const searchResults = await searchInternet(query);

            if (searchResults.length === 0) {
                // Fallback for empty results
                return this.createFallback(date, location, "No relevant financial news found for this date.");
            }

            // Gemini Generation
            const context = searchResults.map((r: any) => `Source: ${r.title} \nLink: ${r.link} \nSnippet: ${r.snippet} `).join('\n\n');

            const prompt = `You are an expert financial journalist.
Analyze the following top news headlines for ${location} on ${dateString}:

${context}

Create a "Daily Financial Briefing" in JSON format with:
1. "title": Catchy headline for the day that encompasses the broader market mood.
2. "sentiment": One word(Bullish, Bearish, Neutral, Volatile).
3. "sentimentScore": Number 0 - 100(0 = Crash, 100 = Boom).
4. "summary": Array of exactly 3 concise bullet points(max 15 words each).
5. "content": A comprehensive "Market Wrap" Blog Post (Markdown). 
   - CRITICAL: You must write a distinct paragraph/section for EACH of the 3 summary points identified above.
   - Structure:
     - **Introduction**: Brief market overview.
     - **Story 1**: Deep dive into the first summary point. 
     - **Story 2**: Deep dive into the second summary point.
     - **Story 3**: Deep dive into the third summary point.
     - **Conclusion**: What to watch for tomorrow.
   - Use headers (##, ###), bold text.
6. "imagePrompt": A high-quality, professional image prompt for a financial-themed illustration. Describe a scene with clean lines, sophisticated financial symbolism (charts, buildings, coins, or abstract growth), cinematic lighting, and a minimalist aesthetic. No text.

Format: JSON only.`;

            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } });

            const result = await retryWithBackoff(async () => {
                return await model.generateContent(prompt);
            });

            const text = result.response.text();
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            let newsData = JSON.parse(cleanedText);

            // Unwrap if nested
            const keys = Object.keys(newsData);
            if (keys.length === 1 && typeof newsData[keys[0]] === 'object' && !Array.isArray(newsData[keys[0]])) {
                newsData = newsData[keys[0]];
            }

            // 3. Generate Hero Image immediately (Resilient)
            let heroImageUrl = null;
            if (newsData.imagePrompt) {
                console.log(`[BriefingService] Generating news image: ${newsData.imagePrompt}`);
                try {
                    const { generateAndSaveImagenImage } = await import('@/lib/imagen');
                    heroImageUrl = await generateAndSaveImagenImage(newsData.imagePrompt, 'uploads/daily-briefing');
                } catch (imgError) {
                    console.error('[BriefingService] Immediate image generation failed:', imgError);
                }
            }

            // 4. Create record with image
            const newBriefing = await prisma.dailyBriefing.create({
                data: {
                    date: date,
                    location: location,
                    summary: newsData.summary || [],
                    sentiment: newsData.sentiment || 'Neutral',
                    sentimentScore: newsData.sentimentScore || 50,
                    title: newsData.title || `Market Update - ${dateString}`,
                    content: newsData.content || '',
                    heroImage: heroImageUrl,
                    sources: searchResults as any
                }
            });

            return { ...newBriefing, source: 'live-generated' };

        } catch (error) {
            console.error('[BriefingService] Error:', error);
            return null;
        }
    }

    private static createFallback(date: Date, location: string, message: string) {
        return {
            id: 'fallback-' + date.getTime(),
            date: date,
            location: location,
            title: "Data Unavailable",
            content: message,
            sentiment: "Neutral",
            sentimentScore: 50,
            summary: ["No data available"],
            source: 'fallback',
            heroImage: null,
            sources: [] as any[]
        };
    }
}
