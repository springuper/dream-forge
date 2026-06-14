import { readSkillFile, loadAllSkillMetas } from '../../skill/loader.js';
import type { Tool } from '../../types.js';

export const skillTools: Tool[] = [
  {
    name: 'list_skills',
    description: 'List all available counselors with their YAML frontmatter (name, description, strengths). Use this to quickly understand which counselors are relevant to the user problem.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'read_skill',
    description: 'Read a counselor skill file. Reading index.md gives you the counselor overview with YAML frontmatter. Cases/quotes/knowledge provide deep content for advice generation.',
    input_schema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'Counselor ID (e.g., zhang_liang, zeng_guofan)' },
        file: {
          type: 'string',
          enum: ['index', 'cases', 'quotes', 'questions', 'knowledge'],
          description: 'File type'
        }
      },
      required: ['skill_id', 'file']
    }
  }
];

export async function executeSkillTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'list_skills': {
      const metas = loadAllSkillMetas();
      return JSON.stringify(metas, null, 2);
    }
    case 'read_skill': {
      const skillId = args.skill_id as string;
      const file = args.file as 'index' | 'cases' | 'quotes' | 'questions' | 'knowledge';
      const content = readSkillFile(skillId, file);
      if (!content) {
        return `Skill ${skillId} file ${file} not found`;
      }
      return content;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}