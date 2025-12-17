import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase not configured. Image storage features will be disabled.");
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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
