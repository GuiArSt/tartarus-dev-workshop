/**
 * Backfill API - Generate summaries for all items missing them
 *
 * Streams progress updates as NDJSON (newline-delimited JSON)
 */

import {
  getDrizzleDb,
  documents,
  linearProjects,
  linearIssues,
  journalEntries,
  projectSummaries,
  skills,
  workExperience,
  education,
  portfolioProjects,
} from "@/lib/db/drizzle";
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
        const docsToBackfill = await db.select().from(documents).where(isNull(documents.summary));

        const docProgress = {
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
              await db.update(documents).set({ summary }).where(eq(documents.id, doc.id));
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

        const projectProgress = {
          total: projectsToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        for (const project of projectsToBackfill) {
          const content = [project.description, project.content].filter(Boolean).join("\n\n");

          if (content.length > 20 && project.id) {
            const summary = await generateSummary("linear_project", content, project.name);

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

        const issueProgress = {
          total: issuesToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        for (const issue of issuesToBackfill) {
          if (issue.description && issue.description.length > 20 && issue.id) {
            const summary = await generateSummary("linear_issue", issue.description, issue.title);

            if (summary) {
              await db.update(linearIssues).set({ summary }).where(eq(linearIssues.id, issue.id));
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
              total: docProgress.total + projectProgress.total + issueProgress.total,
              processed:
                docProgress.processed + projectProgress.processed + issueProgress.processed,
              succeeded:
                docProgress.succeeded + projectProgress.succeeded + issueProgress.succeeded,
              failed: docProgress.failed + projectProgress.failed + issueProgress.failed,
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
        let runningProcessed =
          docProgress.processed + projectProgress.processed + issueProgress.processed;
        let runningSucceeded =
          docProgress.succeeded + projectProgress.succeeded + issueProgress.succeeded;
        let runningFailed = docProgress.failed + projectProgress.failed + issueProgress.failed;

        // === Journal Entries ===
        const entriesToBackfill = await db
          .select()
          .from(journalEntries)
          .where(isNull(journalEntries.summary));

        const entryProgress = {
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

        const summaryProgress = {
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
            const summary = await generateSummary("project_summary", content, proj.repository);

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

        // Update running totals
        runningTotal += summaryProgress.total;
        runningProcessed += summaryProgress.processed;
        runningSucceeded += summaryProgress.succeeded;
        runningFailed += summaryProgress.failed;

        // === Skills ===
        const skillsToBackfill = await db.select().from(skills).where(isNull(skills.summary));

        const skillProgress = {
          total: skillsToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        send({
          type: "progress",
          progress: {
            total: runningTotal + skillProgress.total,
            processed: runningProcessed,
            succeeded: runningSucceeded,
            failed: runningFailed,
            currentItem: "Starting skills...",
          },
        });

        for (const skill of skillsToBackfill) {
          const tags = skill.tags ? JSON.parse(skill.tags) : [];
          const content = [
            `Skill: ${skill.name}`,
            `Category: ${skill.category}`,
            `Proficiency: ${skill.magnitude}/5`,
            skill.description ? `Description: ${skill.description}` : null,
            tags.length ? `Tags: ${tags.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join("\n");

          if (content.length > 20 && skill.id) {
            const summary = await generateSummary("skill", content, skill.name);

            if (summary) {
              await db.update(skills).set({ summary }).where(eq(skills.id, skill.id));
              skillProgress.succeeded++;
            } else {
              skillProgress.failed++;
            }
          } else {
            skillProgress.failed++;
          }

          skillProgress.processed++;
          send({
            type: "progress",
            progress: {
              total: runningTotal + skillProgress.total,
              processed: runningProcessed + skillProgress.processed,
              succeeded: runningSucceeded + skillProgress.succeeded,
              failed: runningFailed + skillProgress.failed,
              currentItem: `Skill: ${skill.name}`,
            },
          });

          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Skills",
            total: skillProgress.total,
            succeeded: skillProgress.succeeded,
            failed: skillProgress.failed,
          },
        });

        // Update running totals
        runningTotal += skillProgress.total;
        runningProcessed += skillProgress.processed;
        runningSucceeded += skillProgress.succeeded;
        runningFailed += skillProgress.failed;

        // === Work Experience ===
        const experienceToBackfill = await db
          .select()
          .from(workExperience)
          .where(isNull(workExperience.summary));

        const expProgress = {
          total: experienceToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        send({
          type: "progress",
          progress: {
            total: runningTotal + expProgress.total,
            processed: runningProcessed,
            succeeded: runningSucceeded,
            failed: runningFailed,
            currentItem: "Starting work experience...",
          },
        });

        for (const exp of experienceToBackfill) {
          const achievements = exp.achievements ? JSON.parse(exp.achievements) : [];
          const content = [
            `Title: ${exp.title}`,
            `Company: ${exp.company}`,
            exp.department ? `Department: ${exp.department}` : null,
            exp.location ? `Location: ${exp.location}` : null,
            `Period: ${exp.startDate} - ${exp.endDate || "Present"}`,
            exp.tagline ? `Description: ${exp.tagline}` : null,
            achievements.length
              ? `Achievements:\n${achievements.map((a: string) => `- ${a}`).join("\n")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n");

          if (content.length > 20 && exp.id) {
            const summary = await generateSummary(
              "work_experience",
              content,
              `${exp.title} at ${exp.company}`
            );

            if (summary) {
              await db.update(workExperience).set({ summary }).where(eq(workExperience.id, exp.id));
              expProgress.succeeded++;
            } else {
              expProgress.failed++;
            }
          } else {
            expProgress.failed++;
          }

          expProgress.processed++;
          send({
            type: "progress",
            progress: {
              total: runningTotal + expProgress.total,
              processed: runningProcessed + expProgress.processed,
              succeeded: runningSucceeded + expProgress.succeeded,
              failed: runningFailed + expProgress.failed,
              currentItem: `Experience: ${exp.title} at ${exp.company}`,
            },
          });

          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Work Experience",
            total: expProgress.total,
            succeeded: expProgress.succeeded,
            failed: expProgress.failed,
          },
        });

        // Update running totals
        runningTotal += expProgress.total;
        runningProcessed += expProgress.processed;
        runningSucceeded += expProgress.succeeded;
        runningFailed += expProgress.failed;

        // === Education ===
        const educationToBackfill = await db
          .select()
          .from(education)
          .where(isNull(education.summary));

        const eduProgress = {
          total: educationToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        send({
          type: "progress",
          progress: {
            total: runningTotal + eduProgress.total,
            processed: runningProcessed,
            succeeded: runningSucceeded,
            failed: runningFailed,
            currentItem: "Starting education...",
          },
        });

        for (const edu of educationToBackfill) {
          const focusAreas = edu.focusAreas ? JSON.parse(edu.focusAreas) : [];
          const achievements = edu.achievements ? JSON.parse(edu.achievements) : [];
          const content = [
            `Degree: ${edu.degree}`,
            `Field: ${edu.field}`,
            `Institution: ${edu.institution}`,
            edu.location ? `Location: ${edu.location}` : null,
            `Period: ${edu.startDate} - ${edu.endDate || "Present"}`,
            edu.tagline ? `Description: ${edu.tagline}` : null,
            focusAreas.length ? `Focus Areas: ${focusAreas.join(", ")}` : null,
            achievements.length
              ? `Achievements:\n${achievements.map((a: string) => `- ${a}`).join("\n")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n");

          if (content.length > 20 && edu.id) {
            const summary = await generateSummary(
              "education",
              content,
              `${edu.degree} in ${edu.field}`
            );

            if (summary) {
              await db.update(education).set({ summary }).where(eq(education.id, edu.id));
              eduProgress.succeeded++;
            } else {
              eduProgress.failed++;
            }
          } else {
            eduProgress.failed++;
          }

          eduProgress.processed++;
          send({
            type: "progress",
            progress: {
              total: runningTotal + eduProgress.total,
              processed: runningProcessed + eduProgress.processed,
              succeeded: runningSucceeded + eduProgress.succeeded,
              failed: runningFailed + eduProgress.failed,
              currentItem: `Education: ${edu.degree} at ${edu.institution}`,
            },
          });

          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Education",
            total: eduProgress.total,
            succeeded: eduProgress.succeeded,
            failed: eduProgress.failed,
          },
        });

        // Update running totals
        runningTotal += eduProgress.total;
        runningProcessed += eduProgress.processed;
        runningSucceeded += eduProgress.succeeded;
        runningFailed += eduProgress.failed;

        // === Portfolio Projects ===
        const portfolioToBackfill = await db
          .select()
          .from(portfolioProjects)
          .where(isNull(portfolioProjects.summary));

        const portfolioProgress = {
          total: portfolioToBackfill.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
        };

        send({
          type: "progress",
          progress: {
            total: runningTotal + portfolioProgress.total,
            processed: runningProcessed,
            succeeded: runningSucceeded,
            failed: runningFailed,
            currentItem: "Starting portfolio projects...",
          },
        });

        for (const proj of portfolioToBackfill) {
          const technologies = proj.technologies ? JSON.parse(proj.technologies) : [];
          const metrics = proj.metrics ? JSON.parse(proj.metrics) : {};
          const tags = proj.tags ? JSON.parse(proj.tags) : [];
          const content = [
            `Project: ${proj.title}`,
            `Category: ${proj.category}`,
            proj.company ? `Company: ${proj.company}` : null,
            proj.role ? `Role: ${proj.role}` : null,
            `Status: ${proj.status}`,
            proj.dateCompleted ? `Completed: ${proj.dateCompleted}` : null,
            proj.excerpt ? `Summary: ${proj.excerpt}` : null,
            proj.description ? `Description: ${proj.description}` : null,
            technologies.length ? `Technologies: ${technologies.join(", ")}` : null,
            Object.keys(metrics).length
              ? `Metrics: ${Object.entries(metrics)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}`
              : null,
            tags.length ? `Tags: ${tags.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join("\n");

          if (content.length > 20 && proj.id) {
            const summary = await generateSummary("portfolio_project", content, proj.title);

            if (summary) {
              await db
                .update(portfolioProjects)
                .set({ summary })
                .where(eq(portfolioProjects.id, proj.id));
              portfolioProgress.succeeded++;
            } else {
              portfolioProgress.failed++;
            }
          } else {
            portfolioProgress.failed++;
          }

          portfolioProgress.processed++;
          send({
            type: "progress",
            progress: {
              total: runningTotal + portfolioProgress.total,
              processed: runningProcessed + portfolioProgress.processed,
              succeeded: runningSucceeded + portfolioProgress.succeeded,
              failed: runningFailed + portfolioProgress.failed,
              currentItem: `Portfolio: ${proj.title}`,
            },
          });

          await new Promise((r) => setTimeout(r, 100));
        }

        send({
          type: "result",
          result: {
            type: "Portfolio Projects",
            total: portfolioProgress.total,
            succeeded: portfolioProgress.succeeded,
            failed: portfolioProgress.failed,
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
