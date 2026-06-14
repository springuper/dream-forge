import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { SkillMeta, CounselorSkill } from '../models/types.js';

const SKILLS_DIR = path.join(process.cwd(), 'skills');

export function listSkillIds(): string[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR).filter(id =>
    fs.statSync(path.join(SKILLS_DIR, id)).isDirectory()
  );
}

export function loadSkillMeta(skillId: string): SkillMeta | null {
  const indexPath = path.join(SKILLS_DIR, skillId, 'index.md');
  if (!fs.existsSync(indexPath)) return null;

  const content = fs.readFileSync(indexPath, 'utf-8');
  const { data } = matter(content);

  return {
    skill_id: skillId,
    name: data.name || skillId,
    description: data.description || '',
    strengths: data.strengths || [],
    style: data.style || ''
  };
}

export function loadAllSkillMetas(): SkillMeta[] {
  return listSkillIds()
    .map(id => loadSkillMeta(id))
    .filter((m): m is SkillMeta => m !== null);
}

export function readSkillFile(skillId: string, file: 'index' | 'cases' | 'quotes' | 'questions' | 'knowledge'): string | null {
  const filePath = path.join(SKILLS_DIR, skillId, `${file}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

export function loadFullSkill(skillId: string): CounselorSkill | null {
  const indexPath = path.join(SKILLS_DIR, skillId, 'index.md');
  if (!fs.existsSync(indexPath)) return null;

  const content = fs.readFileSync(indexPath, 'utf-8');
  const { data, content: markdown } = matter(content);

  const meta: SkillMeta = {
    skill_id: skillId,
    name: data.name || skillId,
    description: data.description || '',
    strengths: data.strengths || [],
    style: data.style || ''
  };

  return {
    skill_id: skillId,
    display_name: markdown.split('\n')[0].replace(/^#\s*/, '').trim(),
    personality: data.personality || '',
    cases: readSkillFile(skillId, 'cases') || '',
    quotes: readSkillFile(skillId, 'quotes') || '',
    questions: readSkillFile(skillId, 'questions') || '',
    knowledge: readSkillFile(skillId, 'knowledge') || '',
    meta
  };
}

export function loadAllSkills(): CounselorSkill[] {
  return listSkillIds()
    .map(id => loadFullSkill(id))
    .filter((s): s is CounselorSkill => s !== null);
}