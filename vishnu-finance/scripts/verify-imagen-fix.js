const { generateAndSaveImagenImage } = require('./src/lib/imagen');
require('dotenv').config({ path: '.env.local' });

async function verifyFix() {
    const prompt = "Manmohan singh vs Narendra Modi finance comparison";
    console.log(`Testing resilience for prompt: "${prompt}"`);

    const result = await generateAndSaveImagenImage(prompt, 'uploads/test-resilience');

    if (result) {
        console.log(`✅ Success! Image saved at: ${result}`);
    } else {
        console.log('❌ Failed to generate image even with fallback.');
    }
}

verifyFix();
