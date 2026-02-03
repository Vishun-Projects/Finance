import fs from 'fs';
import path from 'path';

/**
 * Generates an image using Google's Imagen model via the Gemini API.
 * Saves the image locally and returns the public path.
 * 
 * @param prompt The prompt for image generation.
 * @param relativeUploadDir Directory relative to 'public' to save the image (e.g. 'uploads/daily-news').
 * @returns Public path to the image (e.g. '/uploads/daily-news/abc.jpg') or null if failed.
 */
export async function generateAndSaveImagenImage(prompt: string, relativeUploadDir: string): Promise<string | null> {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error('GOOGLE_API_KEY is missing');
            return null;
        }

        // Using Imagen 3 (via Gemini API style endpoint or specific Imagen endpoint)
        // Based on scripts/test-imagen.js which uses standard REST prediction endpoint
        // URL for Imagen 3 generation
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;

        const payload = {
            instances: [
                {
                    prompt: prompt
                }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9",
                // Helper for standardizing style if needed
                // safetySettings: ...
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Imagen API Error: ${response.status} ${response.statusText}`, errorText);
            return null;
        }

        const data = await response.json();

        let base64Image = null;

        if (data.predictions && data.predictions.length > 0) {
            const prediction = data.predictions[0];
            if (prediction.bytesBase64Encoded) {
                base64Image = prediction.bytesBase64Encoded;
            } else if (prediction.mimeType && prediction.bytesBase64Encoded) {
                base64Image = prediction.bytesBase64Encoded;
            }
        }

        if (!base64Image) {
            console.error('No image data found in Imagen response', JSON.stringify(data));
            return null;
        }

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
        console.error('Error generating/saving Imagen image:', error);
        return null;
    }
}
