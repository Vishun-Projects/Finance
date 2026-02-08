import { generateAndSaveImagenImage } from '../src/lib/imagen.ts';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyFix() {
    const prompt = "Manmohan singh vs Narendra Modi finance comparison";
    console.log(`Testing resilience for prompt: "${prompt}"`);

    try {
        const result = await generateAndSaveImagenImage(prompt, 'uploads/test-resilience');

        if (result) {
            console.log(`✅ Success! Image saved at: ${result}`);
        } else {
            console.log('❌ Failed to generate image even with fallback.');
        }
    } catch (e) {
        console.error('💥 Execution error:', e);
    }
}

verifyFix();
