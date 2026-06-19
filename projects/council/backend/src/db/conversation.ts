import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import type { WorkflowPhase, SocraticAnswer } from '../models/types.js';

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

// Auto-migrate: create conversations table if not exists
export async function initDb(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('DATABASE_URL not set, skipping DB init');
    return;
  }

  const pool = new pg.Pool({ connectionString });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        counselors TEXT[] NOT NULL DEFAULT '{}',
        problem TEXT NOT NULL,
        socratic_answers JSONB NOT NULL DEFAULT '[]',
        current_phase TEXT NOT NULL DEFAULT 'socratic-qa',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Conversations table ready');
  } finally {
    await pool.end();
  }
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