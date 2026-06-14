import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Session {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  picture: string | null;
  expires_at: Date;
  created_at: Date;
}

export async function initSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      picture TEXT,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function createSession(session: Session): Promise<void> {
  await pool.query(
    `INSERT INTO sessions (id, user_id, email, name, picture, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET expires_at = $6`,
    [session.id, session.user_id, session.email, session.name, session.picture, session.expires_at]
  );
}

export async function getSession(id: string): Promise<Session | null> {
  const result = await pool.query(
    `SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()`,
    [id]
  );
  return result.rows[0] || null;
}

export async function deleteSession(id: string): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE id = $1`, [id]);
}

export async function deleteExpiredSessions(): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE expires_at <= NOW()`);
}