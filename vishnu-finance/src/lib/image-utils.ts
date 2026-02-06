import fs from 'fs';
import path from 'path';

/**
 * Downloads an image from a URL and saves it to a local directory within the public folder.
 * @param imageUrl The URL of the image to download.
 * @param relativeUploadDir The directory relative to the 'public' folder where the image should be saved (e.g., 'uploads/education').
 * @returns The public path to the saved image (e.g., '/uploads/education/abc-123.jpg'), or null if failed.
 */
export async function downloadAndSaveImage(imageUrl: string, relativeUploadDir: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            return null;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            console.error(`Invalid content type: ${contentType}. Expected image/*`);
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', relativeUploadDir);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${crypto.randomUUID()}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, buffer);

        return `/${relativeUploadDir}/${fileName}`;
    } catch (error) {
        console.error('Error saving image:', error);
        return null;
    }
}

/**
 * Saves a base64 encoded image to a local directory within the public folder.
 * @param base64Data The base64 string of the image (with or without data URI prefix).
 * @param relativeUploadDir The directory relative to the 'public' folder where the image should be saved.
 * @returns The public path to the saved image (e.g., '/uploads/education/abc-123.jpg'), or null if failed.
 */
export async function saveBase64Image(base64Data: string, relativeUploadDir: string): Promise<string | null> {
    try {
        // Remove data URI prefix if present
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Image, 'base64');

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', relativeUploadDir);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${crypto.randomUUID()}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, buffer);

        return `/${relativeUploadDir}/${fileName}`;
    } catch (error) {
        console.error('Error saving base64 image:', error);
        return null;
    }
}

/**
 * Generates an image using Pollinations.ai with a multi-model fallback strategy.
 * Tries: Flux -> Default (Turbo) -> Minimalist Fallback.
 * @param prompt The prompt to generate the image from.
 * @param relativeUploadDir The directory to save the image to.
 * @returns The public path to the saved image, or a reliable fallback URL if all local saves fail.
 */
export async function generatePollinationsImage(prompt: string, relativeUploadDir: string): Promise<string> {
    const cleanPrompt = prompt.replace(/[^\w\s]/gi, '').substring(0, 100).trim();
    const encodedPrompt = encodeURIComponent(`${cleanPrompt} minimalist vector art`);
    const seed = Math.floor(Math.random() * 1000);

    // Strategy 1: Flux Model (High Quality)
    const fluxUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&nologo=true&seed=${seed}&model=flux`;
    console.log(`[ImageGen] Strategy 1 (Flux): ${fluxUrl}`);
    const fluxPath = await downloadAndSaveImage(fluxUrl, relativeUploadDir);
    if (fluxPath) return fluxPath;

    // Strategy 2: Default/Turbo Model (Reliable/Fast)
    const turboUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&nologo=true&seed=${seed}&model=turbo`;
    console.log(`[ImageGen] Strategy 2 (Turbo): ${turboUrl}`);
    const turboPath = await downloadAndSaveImage(turboUrl, relativeUploadDir);
    if (turboPath) return turboPath;

    // Strategy 3: Ultra-Simplified Prompt (Fail-safe)
    const simplePrompt = encodeURIComponent("minimalist abstract finance geometric shapes");
    const simpleUrl = `https://image.pollinations.ai/prompt/${simplePrompt}?width=1024&height=576&nologo=true&seed=${seed}&model=flux`;
    console.log(`[ImageGen] Strategy 3 (Simple): ${simpleUrl}`);
    const simplePath = await downloadAndSaveImage(simpleUrl, relativeUploadDir);
    if (simplePath) return simplePath;

    // Final Fallback: Context-Aware Unsplash Selection
    // Analyze the prompt to find keywords and serve a relevant, professional stock photo.
    const lowerPrompt = prompt.toLowerCase();
    
    // Curated High-Quality Unsplash Collections (Direct Links)
    const topicMap: Record<string, string[]> = {
        'crypto': [
            'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=1024&auto=format&fit=crop', // Bitcoin/Crypto Generic
            'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=1024&auto=format&fit=crop', // Ethereum/Coin
        ],
        'bitcoin': [
             'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=1024&auto=format&fit=crop',
        ],
        'stock': [
            'https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=1024&auto=format&fit=crop', // Stock Candle Chart
            'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1024&auto=format&fit=crop', // Trading Screen
        ],
        'market': [
            'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1024&auto=format&fit=crop', // Trading Screen
            'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1024&auto=format&fit=crop', // Bull Market concept
        ],
        'tech': [
             'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1024&auto=format&fit=crop', // Code/Screen
             'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1024&auto=format&fit=crop', // Digital World
        ],
        'ai': [
             'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1024&auto=format&fit=crop', // AI Chip/Brain
        ],
        'gold': [
             'https://images.unsplash.com/photo-1610375461246-83df859d849d?q=80&w=1024&auto=format&fit=crop', // Gold Bars
        ],
        'bank': [
             'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?q=80&w=1024&auto=format&fit=crop', // Bank Building/Vault
        ],
        'real estate': [
             'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1024&auto=format&fit=crop', // Modern Building
        ],
        'default': [
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1024&auto=format&fit=crop', // Analytics/General
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1024&auto=format&fit=crop', // Skyscraper/Business
            'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1024&auto=format&fit=crop', // Business Meeting
        ]
    };

    // Find first matching topic
    let selectedTopic = 'default';
    for (const topic of Object.keys(topicMap)) {
        if (topic !== 'default' && lowerPrompt.includes(topic)) {
            selectedTopic = topic;
            break;
        }
    }

    const possibleImages = topicMap[selectedTopic];
    const fallbackUrl = possibleImages[seed % possibleImages.length];

    console.warn(`[ImageGen] All Pollinations strategies failed. Topic detected: '${selectedTopic}'. Using Unsplash fallback: ${fallbackUrl}`);
    return fallbackUrl;
}
