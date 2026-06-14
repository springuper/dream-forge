import type { FastifyInstance } from 'fastify';
import { loadAllSkillMetas } from '../skill/loader.js';
import type { UserInput, ConversationState, WorkflowPhase } from '../models/types.js';

// In-memory conversation store (replace with DB in production)
const conversations = new Map<string, ConversationState>();

export async function conversationHandlers(fastify: FastifyInstance) {
  // List all counselors
  fastify.get('/counselors', async () => {
    const counselors = loadAllSkillMetas();
    return { counselors };
  });

  // Start a new conversation
  fastify.post('/conversation/start', async (request) => {
    const { user_id, problem } = request.body as { user_id: string; problem: string };
    const conversation_id = `conv_${Date.now()}`;

    const state: ConversationState = {
      user_id,
      problem,
      counselors: [],
      socratic_answers: [],
      current_phase: 'counselor-selection' as WorkflowPhase,
      messages: []
    };

    conversations.set(conversation_id, state);

    return {
      conversation_id,
      phase: state.current_phase,
      problem
    };
  });

  // Select counselors
  fastify.post('/conversation/:conversationId/select-counselors', async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    const { counselors } = request.body as { counselors: string[] };

    const state = conversations.get(conversationId);
    if (!state) {
      return { error: 'Conversation not found' };
    }

    state.counselors = counselors;
    state.current_phase = 'socratic-qa' as WorkflowPhase;

    return {
      conversation_id: conversationId,
      phase: state.current_phase,
      counselors: state.counselors
    };
  });

  // Answer a question
  fastify.post('/conversation/:conversationId/answer', async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    const { answer, stop } = request.body as { answer?: string; stop?: boolean };

    const state = conversations.get(conversationId);
    if (!state) {
      return { error: 'Conversation not found' };
    }

    if (stop) {
      state.current_phase = 'advice-generation' as WorkflowPhase;
      return {
        phase: state.current_phase,
        done: true
      };
    }

    return {
      phase: state.current_phase,
      question: 'Placeholder question - Socratic Q&A loop not yet fully implemented',
      done: false
    };
  });

  // Get advice
  fastify.post('/conversation/:conversationId/advice', async (request) => {
    const { conversationId } = request.params as { conversationId: string };

    const state = conversations.get(conversationId);
    if (!state) {
      return { error: 'Conversation not found' };
    }

    state.current_phase = 'finished' as WorkflowPhase;

    return {
      phase: 'finished',
      counselors: state.counselors,
      advice: {
        note: 'Advice generation requires full workflow implementation'
      }
    };
  });

  // Legacy API endpoints (for frontend compatibility)
  fastify.get('/skills', async () => {
    const counselors = loadAllSkillMetas();
    return { counselors };
  });

  fastify.post('/chat/start', async (request) => {
    const { user_id, problem } = request.body as { user_id: string; problem: string };
    const conversation_id = `conv_${Date.now()}`;

    const state: ConversationState = {
      user_id,
      problem,
      counselors: [],
      socratic_answers: [],
      current_phase: 'counselor-selection' as WorkflowPhase,
      messages: []
    };

    conversations.set(conversation_id, state);

    return {
      conversation_id,
      phase: state.current_phase,
      problem
    };
  });

  fastify.post('/chat/answer', async (request) => {
    const { conversation_id, answer } = request.body as { conversation_id: string; answer: string };

    const state = conversations.get(conversation_id);
    if (!state) {
      return { error: 'Conversation not found' };
    }

    return {
      phase: state.current_phase,
      question: 'Placeholder'
    };
  });
}