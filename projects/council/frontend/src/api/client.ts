const API_BASE = '/api'
const SESSION_KEY = 'council_session_token'

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(SESSION_KEY)

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Session-Token': token } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  return res.json()
}

// Types
export interface User {
  id: string
  email: string
  name?: string
  picture?: string
}

export interface SkillMeta {
  skill_id: string
  name: string
  description: string
  strengths?: string[]
  style?: string
}

export interface SkillsListResponse {
  counselors: SkillMeta[]
}

export interface StartConversationRequest {
  user_id: string
  problem: string
  counselors?: string[]
  initial_problem?: string
}

export interface ConversationContext {
  conversation_id: string
  current_phase: string
  current_question?: string
  question_index: number
}

export interface ProfileHints {
  risk_tolerance: number
  thinking_style: string
}

export interface SkillInfo {
  skill_id: string
  name: string
  description: string
  strengths?: string[]
  style?: string
}

export interface StartConversationResponse {
  conversation_id: string
  phase: 'counselor-selection' | 'socratic-qa' | 'advice-generation' | 'finished'
  question?: string
  counselors?: string[]
}

export interface AnswerRequest {
  answer: string
  stop?: boolean
}

export interface AnswerResponse {
  phase: 'socratic-qa' | 'advice-generation' | 'finished'
  question?: string
  context?: string
  done?: boolean
}

export interface AdviceForCounselor {
  advice: string
  cases_reference?: string[]
}

export interface AdviceResponse {
  phase: 'finished'
  counselors: string[]
  advice: Record<string, AdviceForCounselor>
}

// API methods for new TypeScript backend
export async function listCounselors(): Promise<SkillsListResponse> {
  return apiRequest('/counselors')
}

export async function startConversation(req: StartConversationRequest): Promise<StartConversationResponse> {
  // Map initial_problem → problem for backend compatibility
  const body = {
    user_id: req.user_id,
    problem: req.problem || req.initial_problem || '',
    counselors: req.counselors,
  }
  return apiRequest('/conversation/start', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function selectCounselors(conversationId: string, counselors: string[]): Promise<StartConversationResponse> {
  return apiRequest(`/conversation/${conversationId}/select-counselors`, {
    method: 'POST',
    body: JSON.stringify({ counselors }),
  })
}

export async function answerQuestion(conversationId: string, req: AnswerRequest): Promise<AnswerResponse> {
  return apiRequest(`/conversation/${conversationId}/answer`, {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getAdvice(conversationId: string): Promise<AdviceResponse> {
  return apiRequest(`/conversation/${conversationId}/advice`)
}

export async function generateAdvice(conversationId: string): Promise<AdviceResponse> {
  return apiRequest(`/conversation/${conversationId}/advice`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export interface ConversationDetail {
  id: string
  user_id: string
  problem: string
  counselors: string[]
  current_phase: string
  messages: unknown[]
  created_at: string
  updated_at: string
}

export interface ConversationSummary {
  id: string
  problem: string
  counselors: string[]
  current_phase: string
  created_at: string
  updated_at: string
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  return apiRequest(`/conversation/${id}`)
}

export async function listConversations(userId: string): Promise<{ conversations: ConversationSummary[] }> {
  return apiRequest(`/conversations?user_id=${encodeURIComponent(userId)}`)
}

// Legacy API methods (for Rust backend compatibility)
export async function listSkills(): Promise<SkillsListResponse> {
  return apiRequest('/skills')
}

export async function startConversationLegacy(req: StartConversationRequest): Promise<StartConversationResponse> {
  return apiRequest('/chat/start', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function answerQuestionLegacy(req: { conversation_id: string; answer: string }): Promise<StartConversationResponse> {
  return apiRequest('/chat/answer', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function completeConversation(ctx: ConversationContext): Promise<{ advice: AdviceResponse; profile_hints: ProfileHints }> {
  // Placeholder - full workflow integration pending
  return {
    advice: { phase: 'finished', advice: 'Advice generation pending' },
    profile_hints: { risk_tolerance: 0.5, thinking_style: 'rational' },
  }
}