import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { genAI, retryWithBackoff } from '@/lib/gemini';
import { searchInternet } from '@/lib/search';
import { downloadAndSaveImage } from '@/lib/image-utils';

async function requireSuperuser(request: NextRequest) {
    const token = request.cookies.get('auth-token');
    if (!token) return null;
    const user = await AuthService.getUserFromToken(token.value);
    if (!user || user.role !== 'SUPERUSER' || !user.isActive) return null;
    return user;
}

export async function POST(request: NextRequest) {
    try {
        const superuser = await requireSuperuser(request);
        if (!superuser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { topic, category, difficulty } = await request.json();

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        // 1. Search the internet for relevant context
        const searchResults = await searchInternet(topic);
        const searchContext = searchResults.map(r => `Source: ${r.title}\nLink: ${r.link}\nSummary: ${r.snippet}`).join('\n\n');

        // 2. Prepare the AI prompt with search context
        const prompt = `You are an expert financial educator specializing in Indian personal finance. 
Generate a comprehensive, high-quality educational blog post about: "${topic}"
Category: ${category || 'General'}
Difficulty Level: ${difficulty || 'Beginner'}

Current context from the web:
${searchContext || 'No direct web results found. Use your internal knowledge.'}

The response MUST be a valid JSON object with the following structure:
{
  "title": "Compelling Title",
  "slug": "url-friendly-slug",
  "excerpt": "A short, engaging 1-2 sentence summary",
  "content": "Full post content in Markdown format. Include: \n- A catchy intro\n- Detailed sections with headers (##, ###)\n- Practical tips\n- A section for 'Further Reading' or 'References' with clickable links from the context provided above.\n- A concluding thought.",
  "readTime": 5,
  "category": "${category || 'General'}",
  "difficulty": "${difficulty || 'Beginner'}",
  "imagePrompt": "A minimalist, Notion-style linography illustration for the cover image. Panoramic wide banner composition. Black and white line art, clean lines, white background, high contrast, sophisticated financial symbolism."
}

Rules:
1. Use professional but accessible language (avoid overly complex jargon).
2. For Markdown in 'content', use standard headers (##, ###).
3. If web context was provided, weave in the facts and cite the links properly in the 'References' section.
4. Ensure the slug is unique and URL-friendly.
5. Focus on the Indian context (mention things like ITR, 80C, SIP, etc. where relevant).
6. JSON only, no markdown wrappers around the JSON itself.`;

        // Direct REST API Call as per user's robust snippet
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('GOOGLE_API_KEY is missing');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 20,
                topP: 0.8,
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
            }
        };

        const result = await retryWithBackoff(async () => {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errText}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                return { response: { text: () => data.candidates[0].content.parts[0].text } };
            }
            throw new Error('Invalid response structure from Gemini API');
        });

        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const postData = JSON.parse(cleanedText);

        // 3. Generate a cover image URL based on the imagePrompt
        if (postData.imagePrompt) {
            const encodedPrompt = encodeURIComponent(postData.imagePrompt);
            const remoteImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=640&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

            // Try to download and save locally
            const localImagePath = await downloadAndSaveImage(remoteImageUrl, 'uploads/education');

            // Use local path if successful, otherwise fallback to remote
            postData.coverImage = localImagePath || remoteImageUrl;
        }

        return NextResponse.json(postData);
    } catch (error) {
        console.error('Failed to generate education post:', error);
        return NextResponse.json(
            { error: 'Failed to generate content: ' + (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
