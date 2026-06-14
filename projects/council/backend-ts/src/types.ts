// TypeScript types for the agent
// These are compatible with the @anthropic-ai/sdk types

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
}

export interface ToolResult {
  name: string;
  content: string;
}