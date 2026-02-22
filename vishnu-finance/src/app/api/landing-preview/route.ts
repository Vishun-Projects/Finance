import { NextResponse } from 'next/server';
import { genAI, retryWithBackoff, isGeminiQuotaExceeded } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { profile, income, goal, currency = '₹' } = body;

        if (!profile || !income || !goal) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (isGeminiQuotaExceeded()) {
            return NextResponse.json(
                { error: 'Gemini API quota exceeded. Please try again later.' },
                { status: 429 }
            );
        }

        const prompt = `You are a financial Mock Data Generator for a landing page preview.
Generate a realistic JSON strictly matching the structure below based on this user:
Profile: ${profile}
Income: ${currency}${income}/month
Goal: Save for ${goal}

Generate:
1. "transactions": Array of 5 recent transactions. Give realistic descriptions, amounts (in ${currency}), categories (Food, Transport, Utilities, Entertainment, Shopping, etc.), and dates within the last 7 days in YYYY-MM-DD format. Ensure total expenses are somewhat realistic compared to the income.
2. "chartData": Array of 6 objects representing the last 6 months. Include "month" (e.g., "Jan", "Feb"), "income", and "expenses".
3. "insight": A single, highly personalized 1-sentence financial insight or encouraging message about their goal.

Return valid JSON ONLY matching this format:
{
  "transactions": [{"id":"1","date":"2023-10-01","description":"...","amount":100,"category":"...","type":"expense"}],
  "chartData": [{"month":"Jan","income":5000,"expenses":3000}],
  "insight": "..."
}
NO MARKDOWN, NO EXPLANATION. JUST JSON.`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });

        const result = await retryWithBackoff(async () => {
            return await model.generateContent(prompt);
        }, 2, 1000);

        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleaned);

        return NextResponse.json(parsedData);
    } catch (error) {
        console.error('API /landing-preview error:', error);
        return NextResponse.json({ error: 'Failed to generate preview data' }, { status: 500 });
    }
}
