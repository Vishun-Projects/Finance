require('dotenv').config();

async function listModels() {
    try {
        const key = process.env.GOOGLE_API_KEY;
        if (!key) {
            console.error('No GOOGLE_API_KEY found in environment');
            return;
        }
        console.log('Fetching models with key ending in...' + key.slice(-4));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', JSON.stringify(data.error, null, 2));
            return;
        }

        if (!data.models) {
            console.log('No models returned. Response:', JSON.stringify(data, null, 2));
            return;
        }

        console.log('\n--- Available Models ---');
        data.models.forEach(model => {
            if (model.supportedGenerationMethods.includes('generateContent')) {
                console.log(`- ${model.name}`);
                console.log(`  Description: ${model.description}`);
                console.log(`  Version: ${model.version}`);
                console.log('---');
            }
        });

    } catch (err) {
        console.error('Script failed:', err);
    }
}

listModels();
