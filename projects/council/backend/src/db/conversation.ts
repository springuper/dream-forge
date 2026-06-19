import pg from 'pg';
import type { WorkflowPhase, SocraticAnswer } from '../models/types.js';

const connectionString = process.env.DATABASE_URL || '';

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

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString });
  }
  return pool;
}

// Auto-migrate: create conversations table if not exists
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
      counselors TEXT[] NOT NULL DEFAULT '{}',
      problem TEXT NOT NULL,
      socratic_answers JSONB NOT NULL DEFAULT '[]',
      current_phase TEXT NOT NULL DEFAULT 'socratic-qa',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Conversations table ready');
}

export async function createConversation(
  conversationId: string,
  userId: string,
  problem: string,
  counselors: string[]
): Promise<void> {
  const client = getPool();
  await client.query(
    `INSERT INTO conversations (id, user_id, problem, counselors, socratic_answers, current_phase)
     VALUES ($1, $2, $3, $4, '[]', 'socratic-qa')`,
    [conversationId, userId, problem, counselors]
  );
}

export async function getConversation(id: string): Promise<ConversationRow | null> {
  const client = getPool();
  const result = await client.query(
    'SELECT * FROM conversations WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    ...row,
    socratic_answers: typeof row.socratic_answers === 'string' ? JSON.parse(row.socratic_answers) : row.socratic_answers,
  };
}

export async function updateConversation(
  id: string,
  updates: Partial<ConversationRow>
): Promise<void> {
  const client = getPool();
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.counselors !== undefined) {
    sets.push(`counselors = $${idx++}`);
    values.push(updates.counselors);
  }
  if (updates.socratic_answers !== undefined) {
    sets.push(`socratic_answers = $${idx++}`);
    values.push(JSON.stringify(updates.socratic_answers));
  }
  if (updates.current_phase !== undefined) {
    sets.push(`current_phase = $${idx++}`);
    values.push(updates.current_phase);
  }
  sets.push(`updated_at = NOW()`);
  values.push(id);

  await client.query(
    `UPDATE conversations SET ${sets.join(', ')} WHERE id = $${idx}`,
    values
  );
}

export async function deleteConversation(id: string): Promise<void> {
  const client = getPool();
  await client.query('DELETE FROM conversations WHERE id = $1', [id]);
}