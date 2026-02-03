require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function testImageGen() {
    const apiKey = process.env.GOOGLE_API_KEY;
    // found model: models/gemini-2.0-flash-exp-image-generation
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`;

    const prompt = "A futuristic city with flying cars, golden hour lighting, cinematic 8k render";

    const payload = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            responseMimeType: "image/jpeg"
        }
    };

    try {
        console.log('Requesting image from Gemini 2.0 Flash Image Generation...');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('Error:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        console.log('Response received.');

        // Inspect structure
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const part = data.candidates[0].content.parts[0];
            if (part.inlineData) {
                console.log('Image received! MimeType:', part.inlineData.mimeType);
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync('test_gemini_image.jpg', buffer);
                console.log('Saved to test_gemini_image.jpg');
            } else {
                console.log('No inlineData found. Part:', JSON.stringify(part, null, 2));
            }
        } else {
            console.log('Unexpected structure:', JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

testImageGen();
