import pg from 'pg';
import type { WorkflowPhase } from '../models/types.js';

const connectionString = process.env.DATABASE_URL || '';

export interface ConversationRow {
  id: string;
  user_id: string;
  counselors: string[];
  problem: string;
  current_phase: WorkflowPhase;
  advice?: Record<string, { advice: string; cases_reference: string[] }>;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: unknown; // JSONB
  created_at: string;
}

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  if (!connectionString) {
    console.warn('DATABASE_URL not set, skipping DB init');
    return;
  }

  const client = getPool();
  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      problem TEXT NOT NULL,
      counselors TEXT[] NOT NULL DEFAULT '{}',
      current_phase TEXT NOT NULL DEFAULT 'socratic-qa',
      advice JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add advice column if it doesn't exist (for existing tables)
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'advice') THEN
        ALTER TABLE conversations ADD COLUMN advice JSONB;
      END IF;
    END $$
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON conversation_messages(conversation_id)
  `);
  console.log('DB tables ready');
}

export async function createConversation(
  conversationId: string,
  userId: string,
  problem: string,
  counselors: string[]
): Promise<void> {
  const client = getPool();
  await client.query(
    `INSERT INTO conversations (id, user_id, problem, counselors, current_phase) VALUES ($1, $2, $3, $4, 'socratic-qa')`,
    [conversationId, userId, problem, counselors]
  );
}

export async function getConversation(id: string): Promise<ConversationRow | null> {
  const client = getPool();
  const result = await client.query(
    'SELECT * FROM conversations WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function updateConversationPhase(
  id: string,
  phase: WorkflowPhase
): Promise<void> {
  const client = getPool();
  await client.query(
    'UPDATE conversations SET current_phase = $2, updated_at = NOW() WHERE id = $1',
    [id, phase]
  );
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: unknown
): Promise<void> {
  const client = getPool();
  await client.query(
    `INSERT INTO conversation_messages (conversation_id, role, content) VALUES ($1, $2, $3)`,
    [conversationId, role, JSON.stringify(content)]
  );
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const client = getPool();
  const result = await client.query(
    'SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );
  return result.rows;
}

export async function getConversationsByUser(userId: string): Promise<ConversationRow[]> {
  const client = getPool();
  const result = await client.query(
    'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return result.rows;
}

export async function updateConversationAdvice(
  id: string,
  advice: Record<string, { advice: string; cases_reference: string[] }>
): Promise<void> {
  const client = getPool();
  await client.query(
    'UPDATE conversations SET advice = $2, updated_at = NOW() WHERE id = $1',
    [id, JSON.stringify(advice)]
  );
}