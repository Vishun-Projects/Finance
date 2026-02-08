const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env.local
try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
        }
    });
} catch (e) {
    console.error('Failed to load .env.local');
}

async function verifyIntegration() {
    const prompt = "A futuristic city in the clouds, cyberpunk style, cinematic lighting";
    const relativeUploadDir = 'uploads/goals-fast-test';

    try {
        const apiKey = process.env.AIRFORCE_API_KEY;
        if (!apiKey) {
            console.error('AIRFORCE_API_KEY is missing');
            return;
        }

        const model = 'flux-2-klein-9b';
        const url = `https://api.airforce/v1/images/generations`;

        console.log(`[Verify] Generating image with Airforce AI (${model})...`);
        const start = Date.now();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                n: 1,
                size: "1024x576"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Airforce AI Error: ${response.status} ${response.statusText}`, errorText);
            return;
        }

        const data = await response.json();
        const duration = (Date.now() - start) / 1000;
        console.log(`[Verify] API Response received in ${duration}s`);

        const imageUrl = data.data && data.data.length > 0 ? data.data[0].url : (data.url || null);

        if (!imageUrl) {
            console.error('No image URL found in Airforce response', JSON.stringify(data));
            return;
        }

        console.log(`[Verify] Downloading image from: ${imageUrl}`);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            console.error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
            return;
        }

        const buffer = Buffer.from(await imageResponse.arrayBuffer());

        const uploadDir = path.join(process.cwd(), 'public', relativeUploadDir);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `fast-verify-${crypto.randomUUID()}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, buffer);
        console.log(`[Verify] SUCCESS! Image saved at: ${filePath}`);
        console.log(`[Verify] Total Time: ${(Date.now() - start) / 1000}s`);

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verifyIntegration();
