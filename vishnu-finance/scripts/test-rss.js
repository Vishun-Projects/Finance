const https = require('https');

function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`Redirecting to ${res.headers.location}...`);
                fetchRSS(res.headers.location).then(resolve).catch(reject);
                return;
            }
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function parseRSS(xml) {
    const items = [];
    // Simple regex to extract items (robust enough for standard RSS)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];
        const titleMatch = titleRegex.exec(itemContent);
        const linkMatch = linkRegex.exec(itemContent);

        const title = titleMatch ? titleMatch[1] : 'No Title';
        const link = linkMatch ? linkMatch[1] : '#';

        if (title && link) {
            items.push({ title, link });
        }

        if (items.length >= 5) break;
    }
    return items;
}

(async () => {
    console.log('Testing RSS Feeds...');

    const feeds = [
        'https://news.google.com/rss/search?q=finance+india&hl=en-IN&gl=IN&ceid=IN:en', // Search based
        'https://finance.yahoo.com/news/rssindex' // Yahoo Finance
    ];

    for (const feed of feeds) {
        console.log(`\nFetching ${feed}...`);
        try {
            const xml = await fetchRSS(feed);
            console.log(`Response length: ${xml.length} bytes`);
            console.log('First 200 chars:', xml.substring(0, 200));

            const items = parseRSS(xml);
            console.log(`Parsed ${items.length} items.`);
            if (items.length > 0) {
                console.log('Sample:', JSON.stringify(items[0], null, 2));
                break; // Stop if we found a working one
            }
        } catch (e) {
            console.error('Failed:', e.message);
        }
    }
})();
