import { createClient } from '@supabase/supabase-js';

let supabaseAdminInstance: any = null;

if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Create a Supabase client with the SERVICE ROLE key
    // This client has admin privileges and can bypass RLS
    supabaseAdminInstance = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
} else {
    const missing = [];
    if (!process.env.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    console.error(`Missing Supabase environment variables: ${missing.join(', ')}`);
}

export const supabaseAdmin = supabaseAdminInstance;

