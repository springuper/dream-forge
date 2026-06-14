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
  done?: boolean
}

export interface AdviceResponse {
  phase: 'finished'
  advice: string
}

// API methods for new TypeScript backend
export async function listCounselors(): Promise<SkillsListResponse> {
  return apiRequest('/counselors')
}

export async function startConversation(req: StartConversationRequest): Promise<StartConversationResponse> {
  return apiRequest('/conversation/start', {
    method: 'POST',
    body: JSON.stringify(req),
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
  return apiRequest(`/conversation/${conversationId}/advice`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
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