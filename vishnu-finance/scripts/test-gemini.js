const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

const MODELS_TO_TEST = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-pro",
    "gemini-1.0-pro",
    "gemini-2.0-flash",
    "gemini-2.5-flash" // Testing the mystery model
];

async function main() {
    console.log('Testing models with API Key:', (process.env.GOOGLE_API_KEY || '').substring(0, 10) + '...');

    for (const modelName of MODELS_TO_TEST) {
        console.log(`\nTesting: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello");
            console.log(`✅ SUCCESS: ${modelName}`);
            console.log(`   Response: ${result.response.text().trim()}`);
            return; // Exit on first success to save quota
        } catch (e) {
            console.log(`❌ FAILED: ${modelName}`);
            // console.log(e.message);
            if (e.message.includes('404')) console.log('   Error: 404 Not Found');
            else if (e.message.includes('429')) console.log('   Error: 429 Rate Limit');
            else console.log('   Error:', e.message.split('\n')[0]);
        }
    }
}

main();
