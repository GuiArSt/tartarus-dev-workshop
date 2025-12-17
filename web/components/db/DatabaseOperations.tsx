"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download,
  Upload,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export function DatabaseOperations() {
  const [backupStatus, setBackupStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleBackup = async () => {
    setBackupStatus("loading");
    try {
      const response = await fetch("/api/db/backup", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setBackupStatus("success");
        setLastBackup(data.timestamp);
        setTimeout(() => setBackupStatus("idle"), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setBackupStatus("error");
      setTimeout(() => setBackupStatus("idle"), 3000);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch("/api/db/backup");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal_backup_${new Date().toISOString().split("T")[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Operations
        </CardTitle>
        <CardDescription>Manage your journal database backups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleBackup} disabled={backupStatus === "loading"}>
            {backupStatus === "loading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : backupStatus === "success" ? (
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            ) : backupStatus === "error" ? (
              <AlertCircle className="text-destructive mr-2 h-4 w-4" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {backupStatus === "loading"
              ? "Backing up..."
              : backupStatus === "success"
                ? "Backup complete"
                : backupStatus === "error"
                  ? "Backup failed"
                  : "Trigger Backup"}
          </Button>

          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download SQL
          </Button>

          <Button variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" />
            Restore (Coming soon)
          </Button>
        </div>

        {lastBackup && (
          <p className="text-muted-foreground text-sm">
            Last backup: {new Date(lastBackup).toLocaleString()}
          </p>
        )}

        <p className="text-muted-foreground text-xs">
          Backups include all journal entries, project summaries, and attachment metadata. Binary
          attachments are stored separately in the database.
        </p>
      </CardContent>
    </Card>
  );
}
