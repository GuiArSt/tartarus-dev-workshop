/**
 * Backfill API - Generate summaries for all items missing them
 *
 * Streams progress updates as NDJSON (newline-delimited JSON)
 */

import { getDrizzleDb, documents, linearProjects, linearIssues } from "@/lib/db/drizzle";
import { isNull, eq } from "drizzle-orm";

// Types for streaming
interface ProgressUpdate {
  type: "progress";
  progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    currentItem?: string;
  };
}

interface ResultUpdate {
  type: "result";
  result: {
    type: string;
    total: number;
    succeeded: number;
    failed: number;
  };
}

interface ErrorUpdate {
  type: "error";
  error: string;
}

type StreamUpdate = ProgressUpdate | ResultUpdate | ErrorUpdate;

/**
 * Generate summary for a single item
 */
async function generateSummary(
  type: string,
  content: string,
  title: string
): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/ai/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content, title }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.summary || null;
  } catch {
    return null;
  }
}

/**
 * Backfill endpoint - streams progress
 */
export async function POST() {
  const db = getDrizzleDb();

  // Create a readable stream for progress updates
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (update: StreamUpdate) => {
        controller.enqueue(encoder.encode(JSON.stringify(update) + "\n"));
      };

      try {
        // === Documents ===
        const docsToBackfill = await db
          .select()
          .from(documents)
          .where(isNull(documents.summary));

        let docProgress = {
          total: docsToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        send({
          type: "progress",
          progress: { ...docProgress, currentItem: "Starting documents..." },
        });

        for (const doc of docsToBackfill) {
          const content = doc.content || "";
          if (content.length > 20 && doc.id) {
            const summary = await generateSummary("document", content, doc.title);

            if (summary) {
              // Update in database
              await db
                .update(documents)
                .set({ summary })
                .where(eq(documents.id, doc.id));
              docProgress.succeeded++;
            } else {
              docProgress.failed++;
            }
          } else {
            docProgress.failed++;
          }

          docProgress.processed++;
          send({
            type: "progress",
            progress: {
              ...docProgress,
              currentItem: `Document: ${doc.title}`,
            },
          });

          // Small delay to avoid rate limiting
          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Documents",
            total: docProgress.total,
            succeeded: docProgress.succeeded,
            failed: docProgress.failed,
          },
        });

        // === Linear Projects ===
        const projectsToBackfill = await db
          .select()
          .from(linearProjects)
          .where(isNull(linearProjects.summary));

        let projectProgress = {
          total: projectsToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        for (const project of projectsToBackfill) {
          const content = [project.description, project.content]
            .filter(Boolean)
            .join("\n\n");

          if (content.length > 20 && project.id) {
            const summary = await generateSummary(
              "linear_project",
              content,
              project.name
            );

            if (summary) {
              await db
                .update(linearProjects)
                .set({ summary })
                .where(eq(linearProjects.id, project.id));
              projectProgress.succeeded++;
            } else {
              projectProgress.failed++;
            }
          } else {
            projectProgress.failed++;
          }

          projectProgress.processed++;
          send({
            type: "progress",
            progress: {
              total: docProgress.total + projectProgress.total,
              processed: docProgress.processed + projectProgress.processed,
              succeeded: docProgress.succeeded + projectProgress.succeeded,
              failed: docProgress.failed + projectProgress.failed,
              currentItem: `Project: ${project.name}`,
            },
          });

          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Linear Projects",
            total: projectProgress.total,
            succeeded: projectProgress.succeeded,
            failed: projectProgress.failed,
          },
        });

        // === Linear Issues ===
        const issuesToBackfill = await db
          .select()
          .from(linearIssues)
          .where(isNull(linearIssues.summary));

        let issueProgress = {
          total: issuesToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        for (const issue of issuesToBackfill) {
          if (issue.description && issue.description.length > 20 && issue.id) {
            const summary = await generateSummary(
              "linear_issue",
              issue.description,
              issue.title
            );

            if (summary) {
              await db
                .update(linearIssues)
                .set({ summary })
                .where(eq(linearIssues.id, issue.id));
              issueProgress.succeeded++;
            } else {
              issueProgress.failed++;
            }
          } else {
            issueProgress.failed++;
          }

          issueProgress.processed++;
          send({
            type: "progress",
            progress: {
              total:
                docProgress.total + projectProgress.total + issueProgress.total,
              processed:
                docProgress.processed +
                projectProgress.processed +
                issueProgress.processed,
              succeeded:
                docProgress.succeeded +
                projectProgress.succeeded +
                issueProgress.succeeded,
              failed:
                docProgress.failed +
                projectProgress.failed +
                issueProgress.failed,
              currentItem: `Issue: ${issue.identifier}`,
            },
          });

          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Linear Issues",
            total: issueProgress.total,
            succeeded: issueProgress.succeeded,
            failed: issueProgress.failed,
          },
        });

        controller.close();
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
