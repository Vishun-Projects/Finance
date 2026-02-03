require('dotenv').config();
const fs = require('fs');

async function testGemini3Image() {
    const apiKey = process.env.GOOGLE_API_KEY;
    // found model: models/gemini-3-pro-image-preview
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;

    const prompt = "Generate an image of a futuristic city with flying cars. Return the image in the response.";

    const payload = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }]
    };

    try {
        console.log('Requesting from Gemini 3 Pro Image Preview...');
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
        console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');

    } catch (e) {
        console.error('Exception:', e);
    }
}

testGemini3Image();
