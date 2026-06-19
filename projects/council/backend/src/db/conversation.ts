import { createClient } from '@supabase/supabase-js';
import type { WorkflowPhase, SocraticAnswer, Message } from '../models/types.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface ConversationRow {
  id: string;
  user_id: string;
  counselors: string[];
  problem: string;
  socratic_answers: SocraticAnswer[];
  current_phase: WorkflowPhase;
  created_at: string;
  updated_at: string;
}

export async function createConversation(
  conversationId: string,
  userId: string,
  problem: string,
  counselors: string[]
): Promise<void> {
  const { error } = await supabase.from('conversations').insert({
    id: conversationId,
    user_id: userId,
    problem,
    counselors,
    socratic_answers: [],
    current_phase: 'socratic-qa',
  });
  if (error) throw error;
}

export async function getConversation(id: string): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as ConversationRow;
}

export async function updateConversation(
  id: string,
  updates: Partial<ConversationRow>
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw error;
}