
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables.');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKETS = [
    { name: 'super-docs', public: false },
    { name: 'bank-statements', public: false },
    { name: 'user-docs', public: false },
    { name: 'admin-docs', public: false },
];

async function setupBuckets() {
    console.log('🚀 Starting Supabase Bucket Setup...');
    console.log(`Target Project: ${SUPABASE_URL}`);

    for (const bucket of BUCKETS) {
        console.log(`\nChecking bucket: ${bucket.name}...`);

        // Check if bucket exists
        const { data: bucketData, error: getError } = await supabase.storage.getBucket(bucket.name);

        if (getError && getError.message.includes('not found')) {
            console.log(`   Bucket '${bucket.name}' not found. Creating...`);
            const { data, error: createError } = await supabase.storage.createBucket(bucket.name, {
                public: bucket.public,
                fileSizeLimit: 52428800, // 50MB
                allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
            });

            if (createError) {
                console.error(`   ❌ Failed to create bucket '${bucket.name}':`, createError.message);
            } else {
                console.log(`   ✅ Successfully created bucket '${bucket.name}'`);
            }
        } else if (bucketData) {
            console.log(`   ✅ Bucket '${bucket.name}' already exists.`);
            // Optional: Update public status if needed
            if (bucketData.public !== bucket.public) {
                console.log(`   ⚠️ Bucket '${bucket.name}' public status mismatch. Expected ${bucket.public}, got ${bucketData.public}.`);
                // Note: Updating bucket public status might need different API call or manual change
            }
        } else {
            console.error(`   ❌ Error checking bucket '${bucket.name}':`, getError?.message);
        }
    }

    console.log('\n✨ Bucket setup check complete.');
}

setupBuckets().catch(console.error);
