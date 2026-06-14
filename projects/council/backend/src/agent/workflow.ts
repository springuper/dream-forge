import { createMachine, assign } from 'xstate';
import { runAgentLoop, type AgentMessage } from './client.js';
import { allTools } from './tools/index.js';
import { buildPhaseSystemPrompt } from '../llm/prompts.js';
import type { WorkflowPhase, WorkflowContext } from '../models/types.js';

// Skill content for each phase
const PHASE_SKILLS: Record<WorkflowPhase, string> = {
  'counselor-selection': `# Counselor Selection Phase

## Your Task
Understand the user's problem and recommend the most relevant counselor combination (max 3 counselors).

## Available Counselors
Use list_skills to get all counselors with their YAML frontmatter (name, description, strengths).
Then use read_skill(skill_id, "index") to read more details about relevant counselors.

## Decision Rules
- Strategic decisions, crisis handling → Zhang Liang, Zhuge Liang
- Personal relations, moral choices → Liu Bowen, Xun You
- Adversity, perseverance → Zeng Guofan
- Max 3 counselors

## Output Format
Return a JSON object:
{"counselors": ["zhang_liang", "zeng_guofan"], "reason": "Why these counselors"}`,

  'socratic-qa': `# Socratic Q&A Phase

## Your Task
Help the user clarify their thinking through probing questions.

## Core Principles
- Ask only ONE question at a time
- Questions should be deep, not superficial
- Adjust questions based on user answers
- **When to stop**: When you feel you have fully understood the user's problem core, or when the user explicitly says they don't need to continue

## Question Types
- About "momentum": Where is the "momentum" in your current situation?
- About risk: If this decision fails, what is the most likely cause?
- About people: Who are the key people involved? What are their core interests?
- About timing: Is now the right time to act, or should you wait?
- About goals: Looking back three years from now, what do you hope to have done?

## Tool Usage Strategy
- If you need inspiration from a counselor's question style → read_skill(counselor_id, "questions")
- If user has clear personality preferences → read_user_profile

## Output Format
Return a JSON object:
{"question": "Your question", "context": "Why this question"}`,

  'advice-generation': `# Advice Generation Phase

## Your Task
Generate advice from each selected counselor's perspective, based on all the information collected.

## Information Collection Strategy
Before generating advice, decide autonomously:
1. Should you read cases.md for historical parallels?
2. Should you read quotes.md to understand the counselor's decision style?
3. Should you read knowledge.md for background?
4. Should you search_online for relevant modern context?
5. Should you read_user_profile to adjust advice style?

## Output Format
For each counselor, return a JSON object:
{
  "counselor": "zhang_liang",
  "advice": "Advice content in the counselor's voice",
  "cases_reference": ["Which historical cases inspired this advice"]
}`,

  'finished': ''
};

export const workflowMachine = createMachine({
  id: 'council-workflow',
  initial: 'start',
  context: ({ input }: { input: WorkflowContext }) => input,
  states: {
    start: {
      on: {
        BEGIN: 'counselorSelection'
      }
    },
    counselorSelection: {
      invoke: {
        src: 'runPhase',
        input: ({ context }: { context: WorkflowContext }) => ({
          phase: 'counselor-selection' as WorkflowPhase,
          context
        }),
        onDone: {
          target: 'confirmCounselors',
          actions: assign({
            counselors: ({ event }: { event: { output: string[] } }) => event.output,
            currentPhase: () => 'counselor-selection' as WorkflowPhase
          })
        }
      }
    },
    confirmCounselors: {
      on: {
        CONFIRM: 'socraticQA',
        CHANGE: 'counselorSelection'
      }
    },
    socraticQA: {
      invoke: {
        src: 'runPhase',
        input: ({ context }: { context: WorkflowContext }) => ({
          phase: 'socratic-qa' as WorkflowPhase,
          context
        }),
        onDone: {
          target: 'generateAdvice',
          actions: assign({
            socraticAnswers: ({ event }: { event: { output: { answers: { question: string; answer: string }[] } } }) =>
              event.output.answers,
            currentPhase: () => 'socratic-qa' as WorkflowPhase
          })
        }
      },
      on: {
        STOP_EARLY: 'generateAdvice'
      }
    },
    generateAdvice: {
      invoke: {
        src: 'runPhase',
        input: ({ context }: { context: WorkflowContext }) => ({
          phase: 'advice-generation' as WorkflowPhase,
          context
        }),
        onDone: {
          target: 'finished',
          actions: assign({
            currentPhase: () => 'advice-generation' as WorkflowPhase
          })
        }
      }
    },
    finished: {
      type: 'final'
    }
  }
});

export type WorkflowEvent =
  | { type: 'BEGIN' }
  | { type: 'CONFIRM' }
  | { type: 'CHANGE' }
  | { type: 'STOP_EARLY' };

export async function runPhase(
  phase: WorkflowPhase,
  context: WorkflowContext
): Promise<{ counselors?: string[]; answers?: { question: string; answer: string }[] }> {
  const skillContent = PHASE_SKILLS[phase];
  const systemPrompt = buildPhaseSystemPrompt(phase, skillContent);

  if (phase === 'counselor-selection') {
    const userMessage = `User problem: ${context.problem}`;
    const response = await runAgentLoop(systemPrompt, [{ role: 'user', content: userMessage }], allTools);
    try {
      const parsed = JSON.parse(response);
      return { counselors: parsed.counselors || [] };
    } catch {
      return { counselors: [] };
    }
  }

  if (phase === 'socratic-qa') {
    return { answers: context.socraticAnswers };
  }

  if (phase === 'advice-generation') {
    const userMessage = `Problem: ${context.problem}
Counselors: ${context.counselors.join(', ')}
Socratic Q&A: ${JSON.stringify(context.socraticAnswers)}`;
    await runAgentLoop(systemPrompt, [{ role: 'user', content: userMessage }], allTools);
    return {};
  }

  return {};
}