import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
  STORAGE_BUCKET,
} from "@/lib/supabase/server";

// GET - List images or check status
export async function GET(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      configured: false,
      message:
        "Supabase storage not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      images: [],
    });
  }

  try {
    const client = getSupabaseAdmin();
    if (!client) {
      return NextResponse.json({ error: "Supabase client not available" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "";

    const { data, error } = await client.storage.from(STORAGE_BUCKET).list(path);

    if (error) {
      console.error("List error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      configured: true,
      images: data || [],
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to list images" }, { status: 500 });
  }
}

// POST - Upload image
export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase storage not configured" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;
    const commitHash = formData.get("commitHash") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const client = getSupabaseAdmin();
    if (!client) {
      return NextResponse.json({ error: "Supabase client not available" }, { status: 500 });
    }

    // Generate path if not provided
    const uploadPath = path || `${commitHash || "general"}/${Date.now()}-${file.name}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await client.storage.from(STORAGE_BUCKET).upload(uploadPath, buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    const { data: urlData } = client.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (error: any) {
    console.error("Storage POST error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

// DELETE - Delete image
export async function DELETE(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase storage not configured" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    const client = getSupabaseAdmin();
    if (!client) {
      return NextResponse.json({ error: "Supabase client not available" }, { status: 500 });
    }

    const { error } = await client.storage.from(STORAGE_BUCKET).remove([path]);

    if (error) {
      console.error("Delete error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted",
    });
  } catch (error: any) {
    console.error("Storage DELETE error:", error);
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
