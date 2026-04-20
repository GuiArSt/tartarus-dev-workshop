export type { ToolExecutionResult, ToolExecutor } from "./types";

import { journalExecutors } from "./journal";
import { linearExecutors } from "./linear";
import { sliteExecutors } from "./slite";
import { notionExecutors } from "./notion";
import { replicateExecutors } from "./replicate";
import { mediaExecutors } from "./media";
import { repositoryExecutors } from "./repository";
import { gitExecutors } from "./git";
import { searchExecutors } from "./search";
import { googleExecutors } from "./google";
import type { ToolExecutionResult, ToolExecutor } from "./types";

// Registry of all tool executors by domain
const toolExecutors: Record<string, ToolExecutor> = {
  ...journalExecutors,
  ...linearExecutors,
  ...sliteExecutors,
  ...notionExecutors,
  ...replicateExecutors,
  ...mediaExecutors,
  ...repositoryExecutors,
  ...gitExecutors,
  ...searchExecutors,
  ...googleExecutors,
};

// Dispatch a tool call to its executor
export async function executeToolCall(
  toolName: string,
  args: Record<string, any>
): Promise<ToolExecutionResult> {
  const executor = toolExecutors[toolName];
  if (!executor) {
    return { output: `Unknown tool: ${toolName}` };
  }
  return executor(args);
}
