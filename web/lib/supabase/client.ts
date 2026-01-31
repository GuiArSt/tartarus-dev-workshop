import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

/**
 * Client-side Supabase client using publishable key.
 * Uses the new Supabase API key format (sb_publishable_...).
 * Falls back to legacy ANON_KEY for backwards compatibility.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // New format: SUPABASE_PUBLISHABLE_KEY, fallback to legacy ANON_KEY
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  const hasKey = !!(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && hasKey);
}

// Storage bucket name
export const STORAGE_BUCKET = "journal-images";

// Upload an image to Supabase Storage
export async function uploadImage(
  file: File,
  path: string
): Promise<{ url: string; path: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Upload error:", error);
    throw error;
  }

  const { data: urlData } = client.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

// Delete an image from Supabase Storage
export async function deleteImage(path: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.storage.from(STORAGE_BUCKET).remove([path]);

  if (error) {
    console.error("Delete error:", error);
    return false;
  }

  return true;
}

// List images in a path
export async function listImages(path: string = "") {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client.storage.from(STORAGE_BUCKET).list(path);

  if (error) {
    console.error("List error:", error);
    return [];
  }

  return data || [];
}
