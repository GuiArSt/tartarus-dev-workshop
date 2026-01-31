"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BackfillProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
}

interface BackfillResult {
  type: string;
  total: number;
  succeeded: number;
  failed: number;
}

/**
 * Global backfill component for generating all missing summaries
 */
export function BackfillAll() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const [results, setResults] = useState<BackfillResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleBackfill = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setError(null);
    setResults([]);
    setProgress({ total: 0, processed: 0, succeeded: 0, failed: 0 });

    try {
      // Call the backfill API endpoint
      const response = await fetch("/api/ai/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Backfill failed");
      }

      // Stream progress updates
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);

              if (data.type === "progress") {
                setProgress(data.progress);
              } else if (data.type === "result") {
                setResults((prev) => [...prev, data.result]);
              } else if (data.type === "error") {
                setError(data.error);
              }
            } catch {
              // Ignore non-JSON lines
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  };

  const totalSucceeded = results.reduce((sum, r) => sum + r.succeeded, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Backfill All Summaries
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Backfill AI Summaries</DialogTitle>
          <DialogDescription>
            Generate AI summaries for all items that don't have one yet. This may take a while
            depending on the number of items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress indicator */}
          {progress && isRunning && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      Processing {progress.processed} / {progress.total}
                    </span>
                    <span className="text-muted-foreground">
                      {progress.total > 0
                        ? Math.round((progress.processed / progress.total) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="bg-secondary h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{
                        width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  {progress.currentItem && (
                    <p className="text-muted-foreground truncate text-xs">{progress.currentItem}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {results.map((result, i) => (
                    <div key={i} className="text-muted-foreground flex justify-between">
                      <span>{result.type}</span>
                      <span>
                        {result.succeeded} / {result.total}
                        {result.failed > 0 && (
                          <span className="text-destructive ml-1">({result.failed} failed)</span>
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t pt-1 font-medium">
                    <span>Total</span>
                    <span>
                      {totalSucceeded} succeeded
                      {totalFailed > 0 && (
                        <span className="text-destructive ml-1">, {totalFailed} failed</span>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <div className="text-destructive flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action button */}
          <Button onClick={handleBackfill} disabled={isRunning} className="w-full">
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : results.length > 0 ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Run Again
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Backfill
              </>
            )}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Summaries are generated using Claude Haiku 4.5 for fast processing.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
