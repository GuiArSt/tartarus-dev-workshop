import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Server-side Supabase client using secret key.
 * Uses the new Supabase API key format (sb_secret_...).
 * Falls back to legacy SERVICE_ROLE_KEY for backwards compatibility.
 * This bypasses RLS and should only be used in API routes/server components.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // New format: SUPABASE_SECRET_KEY, fallback to legacy SERVICE_ROLE_KEY
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.warn(
      "Supabase admin not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
    return null;
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

export function isSupabaseAdminConfigured(): boolean {
  const hasKey = !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && hasKey);
}

// Storage bucket name
export const STORAGE_BUCKET = "journal-images";
