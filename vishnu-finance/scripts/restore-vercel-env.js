const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getEnvVars(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const vars = {};
    content.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const firstEq = line.indexOf('=');
        if (firstEq === -1) return;
        const key = line.substring(0, firstEq).trim();
        let value = line.substring(firstEq + 1).trim();

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
        }

        if (key && value) vars[key] = value;
    });
    return vars;
}

async function restore() {
    console.log('🚀 Starting Vercel Environment Restore...');

    const env = getEnvVars(path.join(process.cwd(), '.env'));
    const envLocal = getEnvVars(path.join(process.cwd(), '.env.local'));

    // Merge logic: Start with .env, then apply secrets from .env.local, then ensure DATABASE_URL is the pooled one
    // actually, .env has the pooled URL. .env.local has the secrets.

    const finalVars = { ...env, ...envLocal };

    // 1. Enforce DATABASE_URL from .env (Pooled 6543)
    if (env.DATABASE_URL && env.DATABASE_URL.includes(':6543')) {
        finalVars.DATABASE_URL = env.DATABASE_URL;
        console.log('✅ Using Pooled DATABASE_URL from .env');
    } else {
        console.log('⚠️ Warning: Pooled DATABASE_URL not found in .env, checking structure...');
        // specific fix if needed, but we expect .env to be correct
    }

    // 2. Filter out localhost or unused
    if (finalVars.N8N_WEBHOOK_URL && finalVars.N8N_WEBHOOK_URL.includes('localhost')) {
        console.log('🚫 Skipping N8N_WEBHOOK_URL (localhost)');
        delete finalVars.N8N_WEBHOOK_URL;
    }

    // 3. Remove N8N_API_KEY if present
    delete finalVars.N8N_API_KEY;

    // 4. Ensure secrets are not placeholders
    if (finalVars.SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key-here') {
        console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is a placeholder! Aborting to prevent breakage.');
        // Fallback to searching envLocal specifically just in case overwrite happened
        if (envLocal.SUPABASE_SERVICE_ROLE_KEY && envLocal.SUPABASE_SERVICE_ROLE_KEY !== 'your-service-role-key-here') {
            finalVars.SUPABASE_SERVICE_ROLE_KEY = envLocal.SUPABASE_SERVICE_ROLE_KEY;
            console.log('✅ Recovered SUPABASE_SERVICE_ROLE_KEY from .env.local');
        } else {
            process.exit(1);
        }
    }

    const keys = Object.keys(finalVars);
    console.log(`\n📊 Preparing to sync ${keys.length} variables to Production...`);

    for (const key of keys) {
        const value = finalVars[key];
        console.log(`   Detailed Sync: ${key}`);

        try {
            // Write value to temporary file
            const tmpFile = path.join(process.cwd(), '.tmp_env_restore_val');
            fs.writeFileSync(tmpFile, value);

            // Since user deleted all, we can just ADD. 
            // But to be safe against partial runs, we try RM first silently.
            try { execSync(`vercel env rm ${key} production --yes`, { stdio: 'pipe' }); } catch (e) { }

            execSync(`vercel env add ${key} production < .tmp_env_restore_val`, { stdio: 'pipe' });
            fs.unlinkSync(tmpFile);
        } catch (error) {
            console.error(`❌ Failed to add ${key}:`, error.message);
        }
    }

    console.log('\n✨ Restore complete. Triggering Deployment...');
    try {
        execSync('vercel --prod --yes', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Deployment trigger failed:', error.message);
    }
}

restore();
