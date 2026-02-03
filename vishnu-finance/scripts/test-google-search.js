require('dotenv').config();

async function testSearch() {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    console.log('--- Google Search API Test ---');
    console.log(`API Key present: ${apiKey ? 'YES' : 'NO'} (${apiKey ? apiKey.substring(0, 5) + '...' : ''})`);
    console.log(`CX ID present: ${cx ? 'YES' : 'NO'}`);

    if (!apiKey || !cx) {
        console.error('ERROR: Missing GOOGLE_API_KEY or GOOGLE_CUSTOM_SEARCH_ENGINE_ID in .env');
        return;
    }

    const query = 'financial news';
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${query}&num=1`;

    console.log(`\nTesting URL: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log(`\nStatus Code: ${response.status}`);

        if (!response.ok) {
            console.error('❌ API Error Response:');
            console.error(JSON.stringify(data, null, 2));

            if (data.error && data.error.details) {
                console.log('\n--- Troubleshooting Hint ---');
                const reason = data.error.details[0]?.reason;
                if (reason === 'API_KEY_SERVICE_BLOCKED') {
                    console.log('Reason: API_KEY_SERVICE_BLOCKED');
                    console.log('-> This usually means the "Custom Search API" service is NOT enabled in the Google Cloud Project associated with this API Key.');
                    console.log('-> Double check the project ID in the Google Cloud Console top bar matches the one where the key was created.');
                }
            }
        } else {
            console.log('✅ Success! Found items:', data.items?.length || 0);
            if (data.items && data.items.length > 0) {
                console.log('First result title:', data.items[0].title);
            }
        }

    } catch (error) {
        console.error('❌ Network/Script Error:', error);
    }
}

testSearch();
