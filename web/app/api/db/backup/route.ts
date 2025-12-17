import { NextResponse } from "next/server";
import { initDatabase, exportToSQL } from "@/lib/db";
import path from "path";

// GET - Download backup as SQL file
export async function GET() {
  try {
    initDatabase();

    // Create temporary backup
    const backupPath = path.join(process.cwd(), "..", "journal_backup.sql");
    exportToSQL(backupPath);

    // Read and return as download
    const fs = await import("fs");
    const sql = fs.readFileSync(backupPath, "utf-8");

    return new Response(sql, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="journal_backup_${new Date().toISOString().split("T")[0]}.sql"`,
      },
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: error.message || "Backup failed" }, { status: 500 });
  }
}

// POST - Trigger manual backup
export async function POST() {
  try {
    initDatabase();

    const backupPath = path.join(process.cwd(), "..", "journal_backup.sql");
    exportToSQL(backupPath);

    return NextResponse.json({
      success: true,
      message: "Backup completed successfully",
      path: backupPath,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: error.message || "Backup failed" }, { status: 500 });
  }
}
