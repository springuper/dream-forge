import type { Tool } from '../../types.js';

export const askTools: Tool[] = [
  {
    name: 'ask_user',
    description: 'Ask the user a question. The response will be returned as the next user message.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to ask the user' },
        options: { type: 'array', items: { type: 'string' }, description: 'Optional multiple choice options' }
      },
      required: ['question']
    }
  }
];