export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}

export async function searchInternet(query: string): Promise<SearchResult[]> {
    try {
        console.log(`Performing RSS search for: ${query}`);
        // Use Google News RSS Search which supports queries
        const encodedQuery = encodeURIComponent(query);
        const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-IN&gl=IN&ceid=IN:en`;

        const response = await fetch(rssUrl);
        if (!response.ok) {
            console.error(`RSS Fetch failed: ${response.status}`);
            return [];
        }

        const xml = await response.text();
        return parseRSS(xml);

    } catch (error) {
        console.error('Failed to perform RSS search:', error);
        return [];
    }
}

function parseRSS(xml: string): SearchResult[] {
    const items: SearchResult[] = [];

    // Regex for basic RSS parsing (lighter than a full XML parser dependency)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const dateRegex = /<pubDate>(.*?)<\/pubDate>/;

    let match;
    // Limit to top 5 items
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
        const itemContent = match[1];

        const titleMatch = titleRegex.exec(itemContent);
        const linkMatch = linkRegex.exec(itemContent);
        const dateMatch = dateRegex.exec(itemContent);

        const title = titleMatch ? decodeHTMLEntities(titleMatch[1]) : '';
        const link = linkMatch ? linkMatch[1] : '';
        const date = dateMatch ? dateMatch[1] : '';

        // Use date as snippet since RSS description is often HTML heavy or empty in Google News
        const snippet = date ? `Published: ${date}` : 'Latest financial news update.';

        if (title && link) {
            items.push({ title, link, snippet });
        }
    }
    return items;
}

function decodeHTMLEntities(text: string): string {
    return text.replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'");
}
