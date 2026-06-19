import type { FastifyInstance } from 'fastify';
import { loadAllSkillMetas, readSkillFile } from '../skill/loader.js';
import { runAgentLoop, type AgentMessage } from '../agent/client.js';
import { allTools } from '../agent/tools/index.js';
import { buildPhaseSystemPrompt } from '../llm/prompts.js';
import {
  initDb,
  createConversation,
  getConversation,
  updateConversationPhase,
  addMessage,
  getMessages,
  getConversationsByUser,
} from '../db/conversation.js';
import type { WorkflowPhase } from '../models/types.js';

export async function conversationHandlers(fastify: FastifyInstance) {
  await initDb();

  fastify.get('/counselors', async () => {
    return { counselors: loadAllSkillMetas() };
  });

  fastify.get('/conversation/:id', async (request) => {
    const { id } = request.params as { id: string };
    const conversation = await getConversation(id);
    if (!conversation) {
      return { error: 'Conversation not found' };
    }
    const messages = await getMessages(id);
    return {
      ...conversation,
      messages: messages.map(m => m.content),
    };
  });

  fastify.get('/conversations', async (request) => {
    const { user_id } = request.query as { user_id?: string };
    if (!user_id) {
      return { error: 'user_id is required' };
    }
    const conversations = await getConversationsByUser(user_id);
    return { conversations };
  });

  fastify.post('/conversation/start', async (request) => {
    const { user_id, problem, counselors } = request.body as {
      user_id: string;
      problem: string;
      counselors?: string[];
    };

    const conversation_id = `conv_${Date.now()}`;
    const chosen = counselors || [];

    await createConversation(conversation_id, user_id, problem, chosen);

    // Log initial problem as user message
    await addMessage(conversation_id, 'user', { question: problem });

    // Generate first question
    const response = await callSocraticLoop(conversation_id, problem, chosen, []);
    await addMessage(conversation_id, 'assistant', response);

    return {
      conversation_id,
      current_phase: 'socratic-qa' as WorkflowPhase,
      current_question: response.question,
      question_index: 0,
    };
  });

  fastify.post('/conversation/:conversationId/answer', async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    const { answer, stop } = request.body as { answer?: string; stop?: boolean };

    const state = await getConversation(conversationId);
    if (!state) return { error: 'Conversation not found' };

    if (stop) {
      await updateConversationPhase(conversationId, 'advice-generation');
      return { phase: 'advice-generation', done: true };
    }

    if (!answer) return { error: 'No answer provided' };

    const messages = await getMessages(conversationId);
    const problem = state.problem;
    const counselors = state.counselors;
    const history = messages.map(m => m.role === 'user' ? m.content : m.content).filter(Boolean);

    // Log user answer
    await addMessage(conversationId, 'user', { answer });

    // Get updated history after logging
    const updatedMessages = await getMessages(conversationId);

    if (updatedMessages.length >= 11) { // 1 problem + 10 Q&A pairs (5 rounds × 2)
      await updateConversationPhase(conversationId, 'advice-generation');
      return { phase: 'advice-generation', done: true };
    }

    const response = await callSocraticLoop(conversationId, problem, counselors, history.slice(1), answer);
    await addMessage(conversationId, 'assistant', response);

    return {
      phase: state.current_phase,
      current_question: response.question,
      question_index: Math.floor(updatedMessages.length / 2),
      done: false,
    };
  });

  fastify.get('/conversation/:conversationId/advice', async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    const state = await getConversation(conversationId);
    if (!state) return { error: 'Conversation not found' };

    await updateConversationPhase(conversationId, 'finished');

    const messages = await getMessages(conversationId);
    const history = messages.map(m => m.content).filter(Boolean);

    const advice: Record<string, { advice: string; cases_reference: string[] }> = {};
    for (const counselor of state.counselors) {
      advice[counselor] = await callCounselorAdvice(state.problem, state.counselors, history, counselor);
    }

    return { phase: 'finished', counselors: state.counselors, advice };
  });

  fastify.get('/skills', async () => {
    return { counselors: loadAllSkillMetas() };
  });
}

interface SocraticResponse {
  question: string;
  context?: string;
  done?: boolean;
}

async function callSocraticLoop(
  conversationId: string,
  problem: string,
  counselors: string[],
  history: unknown[],
  newAnswer?: string
): Promise<SocraticResponse> {
  const systemPrompt = buildPhaseSystemPrompt('socratic-qa', `# You ask ONE focused question at a time.
Always respond with JSON: {"question": "...", "context": "..."}`);

  let context = `用户问题：${problem}\n\n`;
  if (counselors.length) context += `选择智者：${counselors.join(', ')}\n\n`;
  if (history.length) {
    context += `对话历史：\n${history.map((h: any) =>
      h.answer ? `Q: ${h.question}\nA: ${h.answer}` : `Q: ${h.question}`
    ).join('\n')}\n\n`;
  }
  if (newAnswer) context += `最新回答：${newAnswer}\n\n`;
  context += '请生成下一个追问（用户无需回复时请设置done:true）';

  try {
    const response = await runAgentLoop(systemPrompt, [{ role: 'user', content: context }], allTools);
    const parsed = tryParse(response);
    if (parsed && parsed.question) return { question: parsed.question as string, context: parsed.context as string | undefined };
    return { question: response.trim() };
  } catch (e) {
    return { question: '请继续分享您的想法' };
  }
}

async function callCounselorAdvice(
  problem: string,
  counselors: string[],
  history: unknown[],
  counselorId: string
): Promise<{ advice: string; cases_reference: string[] }> {
  let context = `问题：${problem}\n选择：${counselors.join(', ')}\n\n`;
  context += history.map((h: any) =>
    h.answer ? `Q: ${h.question}\nA: ${h.answer}` : ''
  ).filter(Boolean).join('\n');

  const [index, cases, quotes, knowledge] = await Promise.all([
    readSkillFile(counselorId, 'index'),
    readSkillFile(counselorId, 'cases'),
    readSkillFile(counselorId, 'quotes'),
    readSkillFile(counselorId, 'knowledge'),
  ]);

  if (index) context += `\n【人物】\n${index}\n`;
  if (cases) context += `\n【案例】\n{cases}\n`;
  if (quotes) context += `\n【语录】\n${quotes}\n`;
  if (knowledge) context += `\n【知识】\n${knowledge}\n`;

  context += `\n以${counselorId}视角给出建议`;

  try {
    const response = await runAgentLoop(
      buildPhaseSystemPrompt('advice', ''),
      [{ role: 'user', content: context }],
      allTools
    );
    const parsed = tryParse(response);
    if (parsed && parsed.advice) {
      return {
        advice: String(parsed.advice),
        cases_reference: Array.isArray(parsed.cases_reference) ? parsed.cases_reference.map(String) : [],
      };
    }
    return { advice: response.trim(), cases_reference: [] };
  } catch (e) {
    return { advice: '暂时无法生成建议', cases_reference: [] };
  }
}

function tryParse(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    // Try extracting JSON from markdown code block
    const match = str.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (match) {
      try { return JSON.parse(match[1]); } catch { return null; }
    }
    return null;
  }
}