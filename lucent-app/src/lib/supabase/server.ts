// src/lib/supabase/server.ts
// Server-side Supabase client with administrative or anon key access
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let serverClient: SupabaseClient | null = null;

export function isSupabaseServerConfigured(): boolean {
  return Boolean(supabaseUrl && (serviceRoleKey || anonKey));
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseServerConfigured()) {
    return null;
  }

  if (!serverClient) {
    // Prefer service role key for backend API routes if available, otherwise anon key
    const authKey = serviceRoleKey || anonKey;
    serverClient = createClient(supabaseUrl, authKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClient;
}
