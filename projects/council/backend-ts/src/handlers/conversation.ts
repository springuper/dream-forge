import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { loadAllSkillMetas } from '../skill/loader.js';
import { runSingleTurn } from '../agent/client.js';
import { allTools } from '../agent/tools/index.js';
import { buildPhaseSystemPrompt } from '../llm/prompts.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Simple in-memory state (replace with Supabase/Redis in production)
const conversations = new Map<string, {
  userId: string;
  problem: string;
  counselors: string[];
  socraticAnswers: { question: string; answer: string }[];
  phase: string;
}>();

const COUNSELOR_SELECTION_SKILL = `# Counselor Selection Phase

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
{"counselors": ["zhang_liang", "zeng_guofan"], "reason": "Why these counselors"}`;

const SOCRATIC_QA_SKILL = `# Socratic Q&A Phase

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

## Output Format
Return a JSON object:
{"question": "Your question", "context": "Why this question"}`;

const ADVICE_GENERATION_SKILL = `# Advice Generation Phase

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
}`;

export async function conversationHandlers(fastify: FastifyInstance) {
  // List available counselors
  fastify.get('/api/counselors', async (request: FastifyRequest, reply: FastifyReply) => {
    const metas = loadAllSkillMetas();
    return reply.send({ counselors: metas });
  });

  // Start a new conversation
  fastify.post('/api/conversation/start', async (request: FastifyRequest<{
    Body: { user_id: string; problem: string; counselors?: string[] }
  }>, reply: FastifyReply) => {
    const { user_id, problem, counselors } = request.body;

    const convId = crypto.randomUUID();
    conversations.set(convId, {
      userId: user_id,
      problem,
      counselors: counselors || [],
      socraticAnswers: [],
      phase: counselors?.length ? 'socratic-qa' : 'counselor-selection'
    });

    return reply.send({
      conversation_id: convId,
      phase: conversations.get(convId)!.phase,
      question: null
    });
  });

  // Select counselors
  fastify.post('/api/conversation/:id/select-counselors', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { counselors: string[] }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { counselors } = request.body;

    const conv = conversations.get(id);
    if (!conv) return reply.status(404).send({ error: 'Conversation not found' });

    conv.counselors = counselors;
    conv.phase = 'socratic-qa';

    // Generate first question
    const skillContent = SOCRATIC_QA_SKILL;
    const systemPrompt = buildPhaseSystemPrompt('socratic-qa', skillContent);
    const userMessage = `User problem: ${conv.problem}`;
    const response = await runSingleTurn(systemPrompt, userMessage, allTools);

    try {
      const parsed = JSON.parse(response);
      return reply.send({ phase: 'socratic-qa', question: parsed.question });
    } catch {
      return reply.send({ phase: 'socratic-qa', question: response });
    }
  });

  // Answer a Socratic question
  fastify.post('/api/conversation/:id/answer', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { answer: string; stop?: boolean }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { answer, stop } = request.body;

    const conv = conversations.get(id);
    if (!conv) return reply.status(404).send({ error: 'Conversation not found' });

    // Get last question from messages (simplified - would need proper context in production)
    const lastQuestion = conv.socraticAnswers.length > 0
      ? conv.socraticAnswers[conv.socraticAnswers.length - 1].question
      : 'What is your core problem?';

    conv.socraticAnswers.push({ question: lastQuestion, answer });

    if (stop) {
      conv.phase = 'advice-generation';
      return reply.send({ phase: 'advice-generation', done: true });
    }

    // Generate next question
    const skillContent = SOCRATIC_QA_SKILL;
    const systemPrompt = buildPhaseSystemPrompt('socratic-qa', skillContent);
    const userMessage = `Problem: ${conv.problem}
Previous Q&A: ${JSON.stringify(conv.socraticAnswers)}
User's last answer: ${answer}`;

    const response = await runSingleTurn(systemPrompt, userMessage, allTools);

    try {
      const parsed = JSON.parse(response);
      conv.socraticAnswers.push({ question: parsed.question, answer: '' });
      return reply.send({ phase: 'socratic-qa', question: parsed.question });
    } catch {
      return reply.send({ phase: 'socratic-qa', question: response });
    }
  });

  // Get advice
  fastify.post('/api/conversation/:id/advice', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;

    const conv = conversations.get(id);
    if (!conv) return reply.status(404).send({ error: 'Conversation not found' });

    const skillContent = ADVICE_GENERATION_SKILL;
    const systemPrompt = buildPhaseSystemPrompt('advice-generation', skillContent);
    const userMessage = `Problem: ${conv.problem}
Counselors: ${conv.counselors.join(', ')}
Socratic Q&A: ${JSON.stringify(conv.socraticAnswers)}`;

    const response = await runSingleTurn(systemPrompt, userMessage, allTools);

    // Save to Supabase
    await supabase.from('conversations').insert({
      user_id: conv.userId,
      counselors: conv.counselors,
      problem: conv.problem,
      socratic_answers: conv.socraticAnswers,
      advice: response
    });

    conv.phase = 'finished';
    return reply.send({ phase: 'finished', advice: response });
  });
}