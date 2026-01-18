/**
 * Backfill API - Generate summaries for all items missing them
 *
 * Streams progress updates as NDJSON (newline-delimited JSON)
 */

import { getDrizzleDb, documents, linearProjects, linearIssues, journalEntries, projectSummaries } from "@/lib/db/drizzle";
import { isNull, eq, or, and, isNotNull } from "drizzle-orm";

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

        // Running totals for progress
        let runningTotal = docProgress.total + projectProgress.total + issueProgress.total;
        let runningProcessed = docProgress.processed + projectProgress.processed + issueProgress.processed;
        let runningSucceeded = docProgress.succeeded + projectProgress.succeeded + issueProgress.succeeded;
        let runningFailed = docProgress.failed + projectProgress.failed + issueProgress.failed;

        // === Journal Entries ===
        const entriesToBackfill = await db
          .select()
          .from(journalEntries)
          .where(isNull(journalEntries.summary));

        let entryProgress = {
          total: entriesToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        send({
          type: "progress",
          progress: {
            total: runningTotal + entryProgress.total,
            processed: runningProcessed,
            succeeded: runningSucceeded,
            failed: runningFailed,
            currentItem: "Starting journal entries...",
          },
        });

        for (const entry of entriesToBackfill) {
          // Build content from entry fields
          const content = [
            `Why: ${entry.why}`,
            `What Changed: ${entry.whatChanged}`,
            `Decisions: ${entry.decisions}`,
            entry.kronusWisdom ? `Kronus Wisdom: ${entry.kronusWisdom}` : null,
          ]
            .filter(Boolean)
            .join("\n\n");

          if (content.length > 20 && entry.id) {
            const summary = await generateSummary(
              "journal_entry",
              content,
              `${entry.repository} - ${entry.commitHash.slice(0, 7)}`
            );

            if (summary) {
              await db
                .update(journalEntries)
                .set({ summary })
                .where(eq(journalEntries.id, entry.id));
              entryProgress.succeeded++;
            } else {
              entryProgress.failed++;
            }
          } else {
            entryProgress.failed++;
          }

          entryProgress.processed++;
          send({
            type: "progress",
            progress: {
              total: runningTotal + entryProgress.total,
              processed: runningProcessed + entryProgress.processed,
              succeeded: runningSucceeded + entryProgress.succeeded,
              failed: runningFailed + entryProgress.failed,
              currentItem: `Entry: ${entry.commitHash.slice(0, 7)}`,
            },
          });

          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Journal Entries",
            total: entryProgress.total,
            succeeded: entryProgress.succeeded,
            failed: entryProgress.failed,
          },
        });

        // Update running totals
        runningTotal += entryProgress.total;
        runningProcessed += entryProgress.processed;
        runningSucceeded += entryProgress.succeeded;
        runningFailed += entryProgress.failed;

        // === Project Summaries (Living Documents) ===
        // Only backfill those with content but no summary
        const summariesToBackfill = await db
          .select()
          .from(projectSummaries)
          .where(
            and(
              isNull(projectSummaries.summary),
              or(
                isNotNull(projectSummaries.purpose),
                isNotNull(projectSummaries.architecture),
                isNotNull(projectSummaries.techStack),
                isNotNull(projectSummaries.fileStructure)
              )
            )
          );

        let summaryProgress = {
          total: summariesToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        send({
          type: "progress",
          progress: {
            total: runningTotal + summaryProgress.total,
            processed: runningProcessed,
            succeeded: runningSucceeded,
            failed: runningFailed,
            currentItem: "Starting project summaries (Living Documents)...",
          },
        });

        for (const proj of summariesToBackfill) {
          // Build content from project summary fields
          const content = [
            proj.purpose ? `Purpose: ${proj.purpose}` : null,
            proj.architecture ? `Architecture: ${proj.architecture}` : null,
            proj.techStack ? `Tech Stack: ${proj.techStack}` : null,
            proj.status ? `Status: ${proj.status}` : null,
            proj.technologies ? `Technologies: ${proj.technologies}` : null,
          ]
            .filter(Boolean)
            .join("\n\n");

          if (content.length > 20) {
            const summary = await generateSummary(
              "project_summary",
              content,
              proj.repository
            );

            if (summary) {
              await db
                .update(projectSummaries)
                .set({ summary })
                .where(eq(projectSummaries.repository, proj.repository));
              summaryProgress.succeeded++;
            } else {
              summaryProgress.failed++;
            }
          } else {
            summaryProgress.failed++;
          }

          summaryProgress.processed++;
          send({
            type: "progress",
            progress: {
              total: runningTotal + summaryProgress.total,
              processed: runningProcessed + summaryProgress.processed,
              succeeded: runningSucceeded + summaryProgress.succeeded,
              failed: runningFailed + summaryProgress.failed,
              currentItem: `Living Doc: ${proj.repository}`,
            },
          });

          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Project Summaries (Living Documents)",
            total: summaryProgress.total,
            succeeded: summaryProgress.succeeded,
            failed: summaryProgress.failed,
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
