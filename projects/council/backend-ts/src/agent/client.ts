import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../llm/prompts.js';
import { executeTool } from './tools/index.js';
import type { Tool } from '../types.js';

const client = new Anthropic();

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function runAgentLoop(
  systemPrompt: string,
  messages: AgentMessage[],
  tools: Tool[]
): Promise<string> {
  let currentMessages = [...messages];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      system: systemPrompt,
      messages: currentMessages as any,
      tools: tools as any,
      max_tokens: 4096
    });

    const stopReason = response.stop_reason;

    if (stopReason === 'tool_use') {
      // Collect tool results
      const toolUses = (response.content as any[]).filter(
        (c: any) => c.type === 'tool_use'
      );

      const toolResults: AgentMessage[] = [];

      for (const toolUse of toolUses) {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        toolResults.push({
          role: 'user',
          content: `<tool_result name="${toolUse.name}">${result}</tool_result>`
        });
      }

      const textContent = (response.content as any[]).filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: textContent },
        ...toolResults
      ];

      continue;
    }

    if (stopReason === 'end_turn') {
      const text = (response.content as any[]).filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      return text;
    }

    // Handle other stop reasons
    const text = (response.content as any[]).filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
    return text;
  }
}

export async function runSingleTurn(
  systemPrompt: string,
  userMessage: string,
  tools: Tool[]
): Promise<string> {
  return runAgentLoop(systemPrompt, [{ role: 'user', content: userMessage }], tools);
}