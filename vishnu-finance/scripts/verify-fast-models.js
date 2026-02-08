const apiKey = 'sk-air-4205oGKbigqXGrtZRYshwrZHxSnrOYHFIlW3qVeNsbGMHx6rvGDF5uBySEkD6BJe';
const prompt = "A red sports car, professional photography";

async function verify(model) {
    console.log(`Verifying model ${model}...`);
    const url = `https://api.airforce/v1/images/generations`;

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

        const data = await response.json();
        console.log(`  Model: ${model}`);
        console.log(`  Response: ${JSON.stringify(data)}`);
    } catch (error) {
        console.log(`  Error: ${error.message}`);
    }
}

async function run() {
    await verify('flux-2-klein-9b');
    await verify('veo-3.1-fast');
}

run();
