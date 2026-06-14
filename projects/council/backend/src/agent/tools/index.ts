import type { Tool } from '../../types.js';
import { skillTools, executeSkillTool } from './skill.js';
import { memoryTools, executeMemoryTool } from './memory.js';
import { profileTools, executeProfileTool } from './profile.js';
import { searchTools, executeSearchTool } from './search.js';
import { askTools } from './ask.js';

// All available tools for the agent
export const allTools: Tool[] = [
  ...skillTools,
  ...memoryTools,
  ...profileTools,
  ...searchTools,
  ...askTools
];

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  if (skillTools.some(t => t.name === toolName)) {
    return executeSkillTool(toolName, args);
  }
  if (memoryTools.some(t => t.name === toolName)) {
    return executeMemoryTool(toolName, args);
  }
  if (profileTools.some(t => t.name === toolName)) {
    return executeProfileTool(toolName, args);
  }
  if (searchTools.some(t => t.name === toolName)) {
    return executeSearchTool(toolName, args);
  }
  if (askTools.some(t => t.name === toolName)) {
    return `ask_user: ${args.question}`;
  }
  return `Unknown tool: ${toolName}`;
}

export { executeSkillTool, executeMemoryTool, executeProfileTool, executeSearchTool };