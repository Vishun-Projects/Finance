const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();

// The URL from the specific briefing ID found in the test output
const TARGET_ID = 'cml657oho0000b2pg46160f8s';
const TARGET_URL = "https://image.pollinations.ai/prompt/Minimalist%20linography%20illustration%3A%20A%20stylized%2C%20clean-lined%20bull%20facing%20right%2C%20with%20an%20upward-pointing%20arrow%20integrated%20into%20its%20body.%20In%20the%20background%2C%20a%20subtle%20outline%20of%20the%20Indian%20subcontinent%20is%20visible%2C%20overlaid%20with%20a%20gently%20rising%20line%20graph.%20The%20aesthetic%20is%20high%20contrast%2C%20using%20only%20black%20lines%20on%20a%20pristine%20white%20background%2C%20evoking%20a%20symbolist%20and%20Notion-style%20simplicity.%20No%20text%20elements.?width=1920&height=1080&nologo=true&seed=814912";

async function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            } else {
                reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err.message);
        });
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log(`Checking briefing ${TARGET_ID}...`);
    const briefing = await prisma.dailyBriefing.findUnique({ where: { id: TARGET_ID } });

    if (!briefing) {
        console.error('Target briefing not found!');
        return;
    }

    // Only fix if it's currently a remote URL
    if (!briefing.heroImage.startsWith('http')) {
        console.log('Briefing already has a local image:', briefing.heroImage);
        return;
    }

    console.log('Attempting to download image...');
    const relativeDir = 'uploads/daily-news';
    const uploadDir = path.join(process.cwd(), 'public', relativeDir);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `${crypto.randomUUID()}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            console.log(`Attempt ${attempts}...`);
            await downloadImage(TARGET_URL, filePath);
            console.log('Download success!');

            const publicPath = `/${relativeDir}/${fileName}`;
            await prisma.dailyBriefing.update({
                where: { id: TARGET_ID },
                data: { heroImage: publicPath }
            });
            console.log('Database updated with local path:', publicPath);
            return;
        } catch (e) {
            console.error(`Attempt ${attempts} failed:`, e);
            await wait(2000); // Wait 2s before retry
        }
    }

    console.error('All attempts failed.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
