import fs from 'fs';
import path from 'path';

/**
 * Generates an image using Airforce AI's flux-2-klein-9b model.
 * Saves the image locally and returns the public path.
 * 
 * @param prompt The prompt for image generation.
 * @param relativeUploadDir Directory relative to 'public' to save the image (e.g. 'uploads/goals').
 * @returns Public path to the image (e.g. '/uploads/goals/abc.jpg') or null if failed.
 */
export async function generateAndSaveImagenImage(prompt: string, relativeUploadDir: string): Promise<string | null> {
    const apiKey = process.env.AIRFORCE_API_KEY;
    if (!apiKey) {
        console.error('AIRFORCE_API_KEY is missing');
        return null;
    }

    const models = ['flux-2-klein-9b', 'plutogen-o1'];
    const url = `https://api.airforce/v1/images/generations`;

    for (const model of models) {
        // Wait a bit before each model attempt to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Refine prompt for high quality with Notion-like typography style
            const refinedPrompt = `${prompt}, Notion-like typography style, minimalist, clean aesthetic, flat design, vector illustration, finance editorial, professional colors, elegant layout`;

            const payload = {
                model: model,
                prompt: refinedPrompt,
                n: 1,
                size: "1024x576"
            };

            console.log(`[ImageGen] Attempting with model: ${model}...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 429) {
                console.warn(`[ImageGen] Rate limit hit for ${model}. Waiting 3s...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                // Retry once for rate limit
                const retryResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!retryResponse.ok) continue;
                const data = await retryResponse.json();
                const result = await downloadAndSave(data, relativeUploadDir);
                if (result) return result;
                continue;
            }

            if (!response.ok) {
                const errBody = await response.text().catch(() => 'No body');
                console.error(`[ImageGen] ${model} failed: ${response.status} - ${errBody}`);
                continue;
            }

            const data = await response.json();

            // Check for empty data (often means a filter was triggered)
            if (data.data && data.data.length === 0 && model !== models[models.length - 1]) {
                console.warn(`[ImageGen] ${model} returned empty data (safety filter?). Falling back...`);
                continue;
            }

            const result = await downloadAndSave(data, relativeUploadDir);
            if (result) return result;

        } catch (error) {
            console.error(`[ImageGen] Error with model ${model}:`, error);
        }
    }

    return null;
}

async function downloadAndSave(data: any, relativeUploadDir: string): Promise<string | null> {
    try {
        let imageUrl = null;
        if (data.data && data.data.length > 0) {
            imageUrl = data.data[0].url;
        } else if (data.url) {
            imageUrl = data.url;
        }

        if (!imageUrl) return null;

        console.log(`[ImageGen] Downloading image: ${imageUrl}`);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) return null;

        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        const uploadDir = path.join(process.cwd(), 'public', relativeUploadDir);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${crypto.randomUUID()}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, buffer);
        return `/${relativeUploadDir}/${fileName}`;
    } catch (e) {
        console.error('[ImageGen] Download failed:', e);
        return null;
    }
}
