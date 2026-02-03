import { prisma } from './db';
import { financialTips } from './financial-education';

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

async function migrateTips() {
    console.log('Starting migration of tips...');

    // Find a superuser to be the author
    const author = await prisma.user.findFirst({
        where: { role: 'SUPERUSER' }
    });

    if (!author) {
        console.error('No SUPERUSER found to attribute posts to.');
        return;
    }

    for (const tip of financialTips) {
        const slug = slugify(`${tip.category}-${tip.title}`, { lower: true, strict: true });

        try {
            await prisma.educationPost.upsert({
                where: { slug },
                update: {},
                create: {
                    slug,
                    title: tip.title,
                    content: `${tip.description}\n\n### Actionable Steps\n${tip.steps?.map(s => `- ${s}`).join('\n') || 'None'}\n\n### Benefit\n${tip.benefit || 'N/A'}\n\n### Example\n${tip.example || 'N/A'}`,
                    excerpt: tip.description.substring(0, 150) + '...',
                    category: tip.category.charAt(0).toUpperCase() + tip.category.slice(1),
                    difficulty: tip.difficulty.charAt(0).toUpperCase() + tip.difficulty.slice(1),
                    readTime: 3,
                    published: true,
                    authorId: author.id,
                }
            });
            console.log(`Migrated: ${tip.title}`);
        } catch (error) {
            console.error(`Failed to migrate: ${tip.title}`, error);
        }
    }

    console.log('Migration complete.');
}

migrateTips()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
