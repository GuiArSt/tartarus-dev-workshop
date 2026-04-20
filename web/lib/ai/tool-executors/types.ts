// Structured return type for all tool executors
export interface ToolExecutionResult {
  output: string;
  metadata?: {
    images?: string[];
    model?: string;
    prompt?: string;
    [key: string]: any;
  };
}

export type ToolExecutor = (
  args: Record<string, any>
) => Promise<ToolExecutionResult>;
