import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Generates an image using Airforce AI and saves under `uploads/` (not public).
 * @param prompt Image generation prompt.
 * @param uploadSubPath Path under uploads/ e.g. `user-media/{userId}/goals` or `education`.
 * @returns API file path e.g. `/api/files/user-media/{userId}/goals/{uuid}.jpg` or null.
 */
export async function generateAndSaveImagenImage(
  prompt: string,
  uploadSubPath: string,
): Promise<string | null> {
  const apiKey = process.env.AIRFORCE_API_KEY;
  if (!apiKey) {
    console.error('AIRFORCE_API_KEY is missing');
    return null;
  }

  const models = ['flux-2-klein-9b', 'plutogen-o1'];
  const url = 'https://api.airforce/v1/images/generations';

  for (const model of models) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const refinedPrompt = `${prompt}, Notion-like typography style, minimalist, clean aesthetic, flat design, vector illustration, finance editorial, professional colors, elegant layout`;

      const payload = {
        model,
        prompt: refinedPrompt,
        n: 1,
        size: '1024x576',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!retryResponse.ok) continue;
        const data = await retryResponse.json();
        const result = await downloadAndSave(data, uploadSubPath);
        if (result) return result;
        continue;
      }

      if (!response.ok) continue;

      const data = await response.json();
      if (data.data && data.data.length === 0 && model !== models[models.length - 1]) {
        continue;
      }

      const result = await downloadAndSave(data, uploadSubPath);
      if (result) return result;
    } catch (error) {
      console.error(`[ImageGen] Error with model ${model}:`, error);
    }
  }

  return null;
}

async function downloadAndSave(data: { data?: { url?: string }[]; url?: string }, uploadSubPath: string): Promise<string | null> {
  try {
    let imageUrl: string | null = null;
    if (data.data && data.data.length > 0) {
      imageUrl = data.data[0].url ?? null;
    } else if (data.url) {
      imageUrl = data.url;
    }

    if (!imageUrl) return null;

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) return null;

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'uploads', uploadSubPath);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${randomUUID()}.jpg`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return `/api/files/${uploadSubPath}/${fileName}`;
  } catch (e) {
    console.error('[ImageGen] Download failed:', e);
    return null;
  }
}

/** Legacy public paths — kept for education/briefing admin routes. */
export async function generateAndSavePublicImagenImage(
  prompt: string,
  relativePublicDir: string,
): Promise<string | null> {
  const subPath = relativePublicDir.replace(/^uploads\//, '').replace(/^public\//, '');
  return generateAndSaveImagenImage(prompt, subPath);
}
