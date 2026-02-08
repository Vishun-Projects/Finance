require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.AIRFORCE_API_KEY;
const prompt = "Manmohan singh vs Narendra Modi finance comparison, professional photography, cinematic lighting, photorealistic";

const models = [
    'flux-2-klein-9b',
    'flux',
    'flux-realism',
    'sdxl'
];

async function testModels() {
    console.log(`Testing prompt: "${prompt}"\n`);

    for (const model of models) {
        console.log(`--- Testing model: ${model} ---`);
        try {
            const response = await fetch('https://api.airforce/v1/images/generations', {
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

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                console.log(`✅ Success! Image URL: ${data.data[0].url}`);
            } else {
                console.log(`❌ Failed. Response: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            console.error(`💥 Error with model ${model}:`, error.message);
        }
        console.log('');
    }
}

testModels();
