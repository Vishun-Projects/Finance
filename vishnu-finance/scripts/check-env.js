
const dotenv = require('dotenv');
dotenv.config();

console.log('--- ENV CHECK ---');
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.log('DATABASE_URL is undefined');
} else {
    // Mask password
    const masked = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`DATABASE_URL: ${masked}`);

    // Check start
    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
        console.log('✅ Protocol OK');
    } else {
        console.log('❌ Protocol INVALID');
        console.log(`Starts with: ${dbUrl.substring(0, 15)}...`);
    }
}
