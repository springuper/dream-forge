// Types for Council Agent Workflow

export interface SkillMeta {
  skill_id: string;
  name: string;
  description: string;
  strengths?: string[];
  style?: string;
}

export interface CounselorSkill {
  skill_id: string;
  display_name: string;
  personality: string;
  cases: string;
  quotes: string;
  questions: string;
  knowledge: string;
  meta: SkillMeta;
}

export type WorkflowPhase =
  | 'counselor-selection'
  | 'problem-input'
  | 'socratic-qa'
  | 'advice-generation'
  | 'finished';

export interface ConversationState {
  user_id: string;
  counselors: string[];
  problem: string;
  initial_problem?: string;
  socratic_answers: SocraticAnswer[];
  current_phase: WorkflowPhase;
  messages: Message[];
}

export interface WorkflowContext {
  userId: string;
  problem: string;
  counselors: string[];
  socraticAnswers: { question: string; answer: string }[];
  currentPhase: WorkflowPhase;
  messages: Message[];
}

export interface SocraticAnswer {
  question: string;
  answer: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface UserInput {
  user_id: string;
  action: 'start' | 'answer' | 'select-counselors';
  problem?: string;
  answer?: string;
  counselors?: string[];
}

export interface AgentResponse {
  type: 'question' | 'counselor-selection' | 'advice' | 'done';
  content: string;
  counselors?: string[];
  advice?: Record<string, AdviceForCounselor>;
}

export interface AdviceForCounselor {
  counselor: string;
  advice: string;
  cases_reference?: string[];
}

// Tool input types
export interface ReadSkillInput {
  skill_id: string;
  file: 'index' | 'cases' | 'quotes' | 'questions' | 'knowledge';
}

export interface SearchOnlineInput {
  query: string;
}

export interface ReadMemoryInput {
  user_id: string;
  topic?: string;
}

export interface ReadUserProfileInput {
  user_id: string;
}

export interface AskUserInput {
  question: string;
  options?: string[];
}

export interface RecordMemoryInput {
  user_id: string;
  content: string;
  tags?: string[];
}

// Supabase types
export interface UserProfile {
  id: string;
  cautiousness: number;
  assertiveness: number;
  risk_tolerance: number;
  thinking_style: 'rational' | 'intuitive';
  favored_counselors: string[];
}

export interface MemoryFragment {
  id: string;
  user_id: string;
  content: string;
  tags: string[];
  created_at: string;
}