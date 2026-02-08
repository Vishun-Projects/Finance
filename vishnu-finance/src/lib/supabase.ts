import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Build-safe client: Only initialize if URL is valid.
// If missing during build, it won't crash. If missing at runtime, it will fail when used.
export const supabase = (supabaseUrl && supabaseUrl.startsWith('http'))
    ? createClient(supabaseUrl, supabaseKey || '')
    : new Proxy({} as any, {
        get(_, prop) {
            throw new Error(`Supabase client used but not initialized. Missing NEXT_PUBLIC_SUPABASE_URL. (Property: ${String(prop)})`);
        }
    });
