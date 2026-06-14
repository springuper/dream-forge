import type { Tool } from '../../types.js';

export const askTools: Tool[] = [
  {
    name: 'ask_user',
    description: 'Ask the user a question. Use this to pose Socratic questions or confirm user choices. The response will be returned to you for processing.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional, provide choices for the user to select from'
        }
      },
      required: ['question']
    }
  }
];