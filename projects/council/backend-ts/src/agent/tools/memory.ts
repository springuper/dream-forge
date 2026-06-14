import { createClient } from '@supabase/supabase-js';
import type { Tool } from '../../types.js';
import type { UserProfile, MemoryFragment } from '../../models/types.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export const memoryTools: Tool[] = [
  {
    name: 'read_memory',
    description: 'Read the user\'s long-term memory fragments',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        topic: { type: 'string', description: 'Optional, filter by topic tag' }
      },
      required: ['user_id']
    }
  },
  {
    name: 'record_memory',
    description: 'Save important insights to the user\'s long-term memory',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['user_id', 'content']
    }
  }
];

export async function executeMemoryTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const userId = args.user_id as string;

  switch (toolName) {
    case 'read_memory': {
      const topic = args.topic as string | undefined;
      let query = supabase
        .from('memory_fragments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (topic) {
        query = query.contains('tags', [topic]);
      }

      const { data, error } = await query;
      if (error) return `Error reading memory: ${error.message}`;
      if (!data || data.length === 0) return 'No memory fragments found';

      return JSON.stringify(data, null, 2);
    }
    case 'record_memory': {
      const content = args.content as string;
      const tags = (args.tags as string[]) || [];
      const { data, error } = await supabase
        .from('memory_fragments')
        .insert({ user_id: userId, content, tags })
        .select()
        .single();

      if (error) return `Error recording memory: ${error.message}`;
      return JSON.stringify(data, null, 2);
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}