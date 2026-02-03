const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Initialize Prisma
const prisma = new PrismaClient();

// Load Env
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY);

const TOPICS = [
    // Budgeting
    { category: 'Budgeting', title: 'Control Every Rupee Before It Controls You' },
    { category: 'Budgeting', title: 'Build a Budget That Actually Survives Reality' },
    { category: 'Budgeting', title: 'Smart Cash Flow for Real Life, Not Spreadsheets' },
    { category: 'Budgeting', title: 'Where Your Money Goes — And How to Redirect It' },
    { category: 'Budgeting', title: 'Turn Income Into Strategy, Not Survival' },

    // Saving
    { category: 'Saving', title: 'Make Saving Automatic, Not Emotional' },
    { category: 'Saving', title: 'Build Wealth Buffers That Buy You Freedom' },
    { category: 'Saving', title: 'Small Percentages, Massive Long-Term Impact' },
    { category: 'Saving', title: 'Emergency Funds Without Lifestyle Panic' },
    { category: 'Saving', title: 'Save Like the Future Is Expensive (Because It Is)' },

    // Investing
    { category: 'Investing', title: 'Make Your Money Work Night Shifts' },
    { category: 'Investing', title: 'From First SIP to Advanced Portfolio Strategy' },
    { category: 'Investing', title: 'Grow Wealth Without Guessing or Gambling' },
    { category: 'Investing', title: 'Understand Risk Before It Understands You' },
    { category: 'Investing', title: 'Data-Driven Investing for Long-Term Dominance' },

    // Debt
    { category: 'Debt', title: 'Kill Bad Debt, Use Smart Debt as a Tool' },
    { category: 'Debt', title: 'Escape Interest Traps Faster' },
    { category: 'Debt', title: 'Restructure, Refinance, Reclaim Control' },
    { category: 'Debt', title: 'Understand the Psychology of Borrowing' },
    { category: 'Debt', title: 'Turn Liabilities Into Strategy Decisions' },

    // Insurance
    { category: 'Insurance', title: 'Protect Wealth Before You Build More' },
    { category: 'Insurance', title: 'Coverage That Works When Life Doesn’t' },
    { category: 'Insurance', title: 'Risk Transfer for Grown-Up Financial Planning' },
    { category: 'Insurance', title: 'Stop Overpaying for Fear-Based Policies' },
    { category: 'Insurance', title: 'Insurance as Strategy, Not Just Safety' },

    // Tax
    { category: 'Tax', title: 'Pay What’s Legal — Not a Rupee More' },
    { category: 'Tax', title: 'Structure Income Like the Wealthy Do' },
    { category: 'Tax', title: 'Tax Planning Is Year-Round, Not March Panic' },
    { category: 'Tax', title: 'Understand Deductions, Not Just Deadlines' },
    { category: 'Tax', title: 'Turn Tax Rules Into Financial Advantage' },

    // General
    { category: 'General', title: 'Think Like Capital, Not Just Salary' },
    { category: 'General', title: 'Financial Literacy for the Real World' },
    { category: 'General', title: 'Money Decisions That Compound for Decades' },
    { category: 'General', title: 'Build Systems, Not Just Habits' },
    { category: 'General', title: 'From Surviving Paycheck to Designing Wealth' }
];

async function downloadAndSaveImage(url, title) {
    try {
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedTitle}-${Date.now()}.jpg`;
        const publicDir = path.join(process.cwd(), 'public', 'uploads', 'education');

        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, filename);

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            https.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve(`/uploads/education/${filename}`));
                });
            }).on('error', (err) => {
                fs.unlink(filePath, () => reject(err));
            });
        });
    } catch (e) {
        console.error('Image save failed, using fallback', e);
        return null;
    }
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

async function generatePostContent(topic) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Explicitly ask for JSON to make parsing reliable
    const prompt = `
    You are an expert financial writer for 'Vishnu Finance', a premium financial education platform in India.
    Write a high-quality, comprehensive educational blog post about: "${topic.title}" (Category: ${topic.category}).

    Target Audience: Indian professionals and beginners seeking financial clarity.
    Tone: Professional, empowering, practical, slightly witty ("Notion style").
    
    Output JSON ONLY with this structure:
    {
        "content": "Full markdown content. Use ## and ### headers. Use bullet points. Include a Key Takeaways section at the start.",
        "excerpt": "A compelling 2-sentence summary/hook.",
        "difficulty": "Beginner" or "Intermediate" or "Advanced",
        "readTime": number (minutes),
        "imagePrompt": "A minimalist, premium linography style image prompt describing this concept. High contrast, white background, no text."
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
}

async function main() {
    console.log('🚀 Starting Knowledge Hub Re-seed...');

    // 1. Find Author
    const author = await prisma.user.findFirst();
    if (!author) {
        console.error('❌ No user found to assign as author. Please sign up sequentially first.');
        return;
    }
    console.log(`👤 Assigned Author: ${author.email}`);

    // 2. Clear Existing Posts
    console.log('🗑️  Deleting existing Education Posts...');
    await prisma.educationPost.deleteMany({});
    console.log('✅ Cleared.');

    // 3. Generate New Posts
    for (const [index, topic] of TOPICS.entries()) {

        // CHECK IF EXISTS
        const existing = await prisma.educationPost.findFirst({
            where: { title: topic.title }
        });

        if (existing) {
            console.log(`[${index + 1}/${TOPICS.length}] ⏭️  Skipping (Already exists): "${topic.title}"`);
            continue;
        }

        console.log(`\n[${index + 1}/${TOPICS.length}] Generating: "${topic.title}"...`);

        try {
            // A. Generate Text
            const aiData = await generatePostContent(topic);

            // B. Generate Image
            const encodedPrompt = encodeURIComponent(aiData.imagePrompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

            // C. Save Image (or use remote if save fails, but let's try strict save)
            let coverImage = await downloadAndSaveImage(imageUrl, topic.title);
            if (!coverImage) coverImage = imageUrl; // Fallback

            // D. Save to DB
            const slug = slugify(topic.title);

            await prisma.educationPost.create({
                data: {
                    title: topic.title,
                    slug: slug,
                    category: topic.category,
                    content: aiData.content,
                    excerpt: aiData.excerpt,
                    difficulty: aiData.difficulty,
                    readTime: aiData.readTime,
                    published: true,
                    authorId: author.id,
                    coverImage: coverImage,
                    imagePrompt: aiData.imagePrompt
                }
            });

            console.log(`✅ Saved: ${topic.title}`);

            // Delay to avoid strict rate limits (3 seconds for safety)
            console.log('⏳ Waiting 3s for rate limit...');
            await new Promise(r => setTimeout(r, 3000));

        } catch (error) {
            console.error(`❌ Failed to generate "${topic.title}":`, error.message);
            // If it was a rate limit, maybe wait longer?
        }
    }

    console.log('\n✨ Re-seed Complete!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
