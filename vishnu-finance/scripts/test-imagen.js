require('dotenv').config();
const fs = require('fs');

async function testImagen() {
    const apiKey = process.env.GOOGLE_API_KEY;
    // found model: models/imagen-4.0-generate-001
    // Usually imagen uses the :predict endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

    const prompt = "A futuristic city with flying cars, golden hour lighting, cinematic 8k render";

    // Standard Imagen payload structure
    const payload = {
        instances: [
            {
                prompt: prompt
            }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "16:9"
        }
    };

    try {
        console.log('Requesting image from Imagen 4.0...');
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

        // Inspect structure for predictions
        if (data.predictions && data.predictions.length > 0) {
            const prediction = data.predictions[0];
            // Imagen usually returns bytesBase64Encoded or similar
            if (prediction.bytesBase64Encoded) {
                console.log('Image received!');
                const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
                fs.writeFileSync('test_imagen.jpg', buffer);
                console.log('Saved to test_imagen.jpg');
            } else if (prediction.mimeType && prediction.bytesBase64Encoded) { // Check for variations
                const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
                fs.writeFileSync('test_imagen.jpg', buffer);
                console.log('Saved to test_imagen.jpg');
            } else {
                console.log('Prediction found but unknown format:', JSON.stringify(prediction, null, 2));
            }
        } else {
            console.log('Unexpected structure:', JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

testImagen();
