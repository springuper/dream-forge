import { createClient } from '@supabase/supabase-js';
import type { Tool } from '../../types.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export const profileTools: Tool[] = [
  {
    name: 'read_user_profile',
    description: 'Read the user\'s profile including personality type, preferences, and past decision-making style',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' }
      },
      required: ['user_id']
    }
  }
];

export async function executeProfileTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const userId = args.user_id as string;

  switch (toolName) {
    case 'read_user_profile': {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return 'No profile found for this user. Use default values: cautiousness=0.5, assertiveness=0.5, risk_tolerance=0.5, thinking_style=rational';
        }
        return `Error reading profile: ${error.message}`;
      }
      return JSON.stringify(data, null, 2);
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}