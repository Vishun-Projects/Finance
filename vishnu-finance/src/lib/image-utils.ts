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
        const response = await fetch(imageUrl);
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
