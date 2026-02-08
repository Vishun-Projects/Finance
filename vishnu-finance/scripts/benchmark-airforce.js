const apiKey = 'sk-air-4205oGKbigqXGrtZRYshwrZHxSnrOYHFIlW3qVeNsbGMHx6rvGDF5uBySEkD6BJe';
const prompt = "A red sports car, professional photography";

async function benchmark(model) {
    console.log(`Benchmarking model ${model}...`);
    const url = `https://api.airforce/v1/images/generations`;
    const start = Date.now();

    try {
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
                size: "512x512"
            })
        });

        if (!response.ok) {
            console.log(`  Failed: ${response.status} ${response.statusText}`);
            return Infinity;
        }

        const data = await response.json();
        const duration = (Date.now() - start) / 1000;
        console.log(`  Success! Duration: ${duration}s`);
        return duration;
    } catch (error) {
        console.log(`  Error: ${error.message}`);
        return Infinity;
    }
}

async function runTests() {
    const models = ['z-image', 'flux-2-klein-4b', 'flux-2-klein-9b', 'veo-3.1-fast', 'plutogen-o1'];

    for (const model of models) {
        await benchmark(model);
        // Add a small delay between tests to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
    }
}

runTests();
