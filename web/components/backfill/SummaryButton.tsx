"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SummaryType =
  | "journal_entry"
  | "project_summary"
  | "document"
  | "linear_issue"
  | "linear_project"
  | "attachment"
  | "media";

interface SummaryButtonProps {
  type: SummaryType;
  id: string | number;
  content: string;
  title?: string;
  currentSummary?: string | null;
  onSummaryGenerated?: (summary: string) => void;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
}

/**
 * Button to generate AI summary for a single item
 */
export function SummaryButton({
  type,
  id,
  content,
  title,
  currentSummary,
  onSummaryGenerated,
  size = "icon",
  variant = "ghost",
}: SummaryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSummary = !!currentSummary;

  const handleGenerate = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, title }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate summary");
      }

      const data = await response.json();

      // Show success state briefly
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);

      // Callback with the generated summary
      if (onSummaryGenerated && data.summary) {
        onSummaryGenerated(data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleGenerate}
            disabled={isLoading}
            className={
              isSuccess
                ? "text-green-500"
                : hasSummary
                  ? "text-muted-foreground"
                  : ""
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {size !== "icon" && (
              <span className="ml-1">
                {isLoading
                  ? "Generating..."
                  : isSuccess
                    ? "Done!"
                    : hasSummary
                      ? "Regenerate"
                      : "Generate Summary"}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : hasSummary ? (
            <p>Regenerate AI summary</p>
          ) : (
            <p>Generate AI summary for indexing</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
