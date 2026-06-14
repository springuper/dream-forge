import type { Tool } from '../../types.js';

export const searchTools: Tool[] = [
  {
    name: 'search_online',
    description: 'Search online for relevant information. Use this when you need historical background, business cases, or real-time information.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' }
      },
      required: ['query']
    }
  }
];

export async function executeSearchTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'search_online': {
      const query = args.query as string;
      // TODO: Implement actual search. For now, return a placeholder.
      // Options: SerpAPI, Tavily, or direct DuckDuckGo scrape
      return `Search not yet implemented. Query was: ${query}`;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}