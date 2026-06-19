import type { FastifyInstance } from 'fastify';
import { loadAllSkillMetas, readSkillFile } from '../skill/loader.js';
import { runAgentLoop, type AgentMessage } from '../agent/client.js';
import { allTools } from '../agent/tools/index.js';
import { buildPhaseSystemPrompt } from '../llm/prompts.js';
import { createConversation, getConversation, updateConversation } from '../db/conversation.js';
import type { WorkflowPhase, SocraticAnswer } from '../models/types.js';

const SOCRATIC_PHASE_PROMPT = `# Socratic Q&A Phase

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
{"question": "Your question", "context": "Why this question", "done": false}`;

export async function conversationHandlers(fastify: FastifyInstance) {
  // List all counselors
  fastify.get('/counselors', async () => {
    const counselors = loadAllSkillMetas();
    return { counselors };
  });

  // Start a new conversation
  fastify.post('/conversation/start', async (request) => {
    const { user_id, problem, counselors } = request.body as {
      user_id: string;
      problem: string;
      counselors?: string[];
    };
    const conversation_id = `conv_${Date.now()}`;

    await createConversation(conversation_id, user_id, problem, counselors || []);

    const state = { problem, counselors: counselors || [], socratic_answers: [] as SocraticAnswer[] };
    const firstQuestion = await generateSocraticQuestion(state);

    return {
      conversation_id,
      current_phase: 'socratic-qa' as WorkflowPhase,
      current_question: firstQuestion,
      question_index: 0
    };
  });

  // Answer a question
  fastify.post('/conversation/:conversationId/answer', async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    const { answer, stop } = request.body as { answer?: string; stop?: boolean };

    const state = await getConversation(conversationId);
    if (!state) {
      return { error: 'Conversation not found' };
    }

    if (stop) {
      await updateConversation(conversationId, { current_phase: 'advice-generation' });
      return {
        phase: 'advice-generation',
        done: true
      };
    }

    // Store the answer
    if (answer && state.socratic_answers) {
      const lastQuestion = state.socratic_answers.length > 0
        ? state.socratic_answers[state.socratic_answers.length - 1].question
        : '初始问题';

      state.socratic_answers.push({ question: lastQuestion, answer });
      await updateConversation(conversationId, { socratic_answers: state.socratic_answers });
    }

    // Check if we've asked enough questions (max 5) or user wants to stop
    if ((state.socratic_answers?.length || 0) >= 5) {
      await updateConversation(conversationId, { current_phase: 'advice-generation' });
      return {
        phase: 'advice-generation',
        done: true
      };
    }

    // Generate next question using LLM
    const nextQuestion = await generateSocraticQuestion(state);

    return {
      phase: state.current_phase,
      current_question: nextQuestion,
      question_index: state.socratic_answers?.length || 0,
      done: false
    };
  });

  // Get advice
  fastify.post('/conversation/:conversationId/advice', async (request) => {
    const { conversationId } = request.params as { conversationId: string };

    const state = await getConversation(conversationId);
    if (!state) {
      return { error: 'Conversation not found' };
    }

    await updateConversation(conversationId, { current_phase: 'finished' });

    // Generate advice for each counselor
    const advice: Record<string, { advice: string; cases_reference: string[] }> = {};

    for (const counselor of state.counselors || []) {
      const counselorAdvice = await generateCounselorAdvice(state, counselor);
      advice[counselor] = counselorAdvice;
    }

    return {
      phase: 'finished',
      counselors: state.counselors,
      advice
    };
  });

  // Legacy API endpoints
  fastify.get('/skills', async () => {
    const counselors = loadAllSkillMetas();
    return { counselors };
  });
}

async function generateSocraticQuestion(state: { problem: string; counselors?: string[]; socratic_answers?: SocraticAnswer[] }): Promise<string> {
  const systemPrompt = buildPhaseSystemPrompt('socratic-qa', SOCRATIC_PHASE_PROMPT);

  let context = `用户问题：${state.problem || '未提供'}\n\n`;

  if (state.counselors?.length) {
    context += `选择的智者：${state.counselors.join(', ')}\n\n`;
  }

  if (state.socratic_answers?.length) {
    context += `问答历史：\n`;
    state.socratic_answers.forEach((qa, i) => {
      context += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n`;
    });
    context += `\n基于以上对话，请生成下一个追问：`;
  } else {
    context += `请根据用户的问题生成第一个追问：`;
  }

  const messages: AgentMessage[] = [{ role: 'user', content: context }];

  try {
    const response = await runAgentLoop(systemPrompt, messages, allTools);
    try {
      const parsed = JSON.parse(response);
      return parsed.question || '请继续分享更多关于您的情况';
    } catch {
      return response.trim();
    }
  } catch (e) {
    console.error('Error generating socratic question:', e);
    return '请继续分享更多关于您的情况';
  }
}

async function generateCounselorAdvice(
  state: { problem: string; counselors?: string[]; socratic_answers?: SocraticAnswer[] },
  counselorId: string
): Promise<{ advice: string; cases_reference: string[] }> {
  const [indexContent, casesContent, quotesContent, , knowledgeContent] = await Promise.all([
    readSkillFile(counselorId, 'index'),
    readSkillFile(counselorId, 'cases'),
    readSkillFile(counselorId, 'quotes'),
    readSkillFile(counselorId, 'questions'),
    readSkillFile(counselorId, 'knowledge'),
  ]);

  const systemPrompt = buildPhaseSystemPrompt('advice-generation', `# Advice Generation Phase`);

  let context = `你是 ${counselorId}，请基于以下信息给出建议。\n\n`;
  context += `用户原始问题：${state.problem || '未提供'}\n\n`;

  if (state.socratic_answers?.length) {
    context += `问答澄清过程：\n`;
    state.socratic_answers.forEach((qa) => {
      context += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
    });
  }

  if (indexContent) context += `\n【Counselor Background】\n${indexContent}\n`;
  if (casesContent) context += `\n【Relevant Historical Cases】\n${casesContent}\n`;
  if (quotesContent) context += `\n【Counselor Quotes】\n${quotesContent}\n`;
  if (knowledgeContent) context += `\n【Additional Knowledge】\n${knowledgeContent}\n`;

  context += `\n请以 ${counselorId} 的视角，给出一段建议。`;

  try {
    const response = await runAgentLoop(systemPrompt, [{ role: 'user', content: context }], allTools);
    const casesRef: string[] = [];
    const caseMatches = response.match(/【.*?】/g);
    if (caseMatches) casesRef.push(...caseMatches);

    return { advice: response.trim(), cases_reference: casesRef };
  } catch (e) {
    console.error('Error generating advice:', e);
    return { advice: '抱歉，暂时无法生成建议。请稍后再试。', cases_reference: [] };
  }
}