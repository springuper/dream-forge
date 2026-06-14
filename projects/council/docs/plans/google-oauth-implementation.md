# Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Google OAuth 登录，本地开发和 GCP 部署均可工作

**Architecture:** 前端用 react-router-dom 做路由，OAuth callback 走 hash 路由 `/auth/callback`。后端 Fastify 处理 `/api/auth/google`、`/api/auth/callback`、`/api/auth/me`、`/api/auth/logout`。Session 存 PostgreSQL sessions 表。

**Tech Stack:** react-router-dom, @fastify/cors, pg (node-postgres), Google OAuth 2.0

---

## Task 1: Backend session DB module

**Files:**
- Create: `backend/src/db/session.ts`

- [ ] **Step 1: Write the session DB module**

```typescript
// backend/src/db/session.ts
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
  const result = await pool.query(`SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()`, [id]);
  return result.rows[0] || null;
}

export async function deleteSession(id: string): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE id = $1`, [id]);
}

export async function deleteExpiredSessions(): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE expires_at <= NOW()`);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/db/session.ts
git commit -m "feat(auth): add session DB module with PostgreSQL"
```

---

## Task 2: Backend auth handler

**Files:**
- Create: `backend/src/handlers/auth.ts`

- [ ] **Step 1: Write the auth handler**

```typescript
// backend/src/handlers/auth.ts
import type { FastifyInstance } from 'fastify';
import { initSessionTable, createSession, getSession, deleteSession } from '../db/session.js';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

function generateState(): string {
  return Array.from({ length: 16 }, () => Math.random().toString(16)[2]).join('');
}

function generateSessionId(): string {
  return Array.from({ length: 32 }, () => Math.random().toString(16)[2]).join('');
}

export async function authHandlers(fastify: FastifyInstance) {
  // Initialize DB on startup
  try {
    await initSessionTable();
    fastify.log.info('Session table initialized');
  } catch (e) {
    fastify.log.error('Failed to initialize session table:', e);
  }

  // GET /api/auth/google - redirect to Google OAuth
  fastify.get('/auth/google', async (request, reply) => {
    const state = generateState();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/#/auth/callback';

    if (!clientId) {
      return reply.status(500).send({ error: 'GOOGLE_CLIENT_ID not configured' });
    }

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');

    // Store state temporarily in a cookie (expires in 60 min)
    reply.setCookie('oauth_state', state, {
      path: '/',
      httpOnly: true,
      maxAge: 3600,
      sameSite: 'lax',
    });

    return reply.redirect(url.toString());
  });

  // POST /api/auth/callback - exchange code for session
  fastify.post('/auth/callback', async (request, reply) => {
    const { code, state } = request.body as { code: string; state: string };

    // Verify state
    const savedState = request.cookies['oauth_state'];
    if (!state || state !== savedState) {
      return reply.status(401).send({ error: 'Invalid state' });
    }

    // Clear state cookie
    reply.clearCookie('oauth_state', { path: '/' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/#/auth/callback';

    if (!clientId || !clientSecret) {
      return reply.status(500).send({ error: 'Google OAuth not configured' });
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      fastify.log.error('Google token exchange failed:', err);
      return reply.status(401).send({ error: 'OAuth exchange failed' });
    }

    const tokenData: GoogleTokenResponse = await tokenRes.json();

    // Decode id_token to get user info
    const payload = JSON.parse(Buffer.from(tokenData.id_token!.split('.')[1], 'base64').toString());
    const userInfo: GoogleUserInfo = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

    // Create session (7 days)
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await createSession({
      id: sessionId,
      user_id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    return {
      session_token: sessionId,
      user: {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
    };
  });

  // GET /api/auth/me - get current user
  fastify.get('/auth/me', async (request, reply) => {
    const token = request.headers['x-session-token'] as string;

    if (!token) {
      return reply.status(401).send({ error: 'No session token' });
    }

    const session = await getSession(token);
    if (!session) {
      return reply.status(401).send({ error: 'Invalid or expired session' });
    }

    return {
      user: {
        id: session.user_id,
        email: session.email,
        name: session.name,
        picture: session.picture,
      },
    };
  });

  // POST /api/auth/logout - delete session
  fastify.post('/auth/logout', async (request, reply) => {
    const token = request.headers['x-session-token'] as string;

    if (token) {
      await deleteSession(token);
    }

    return { success: true };
  });
}
```

- [ ] **Step 2: Register auth handlers in index.ts**

Modify `backend/src/index.ts`:

```typescript
// Add after conversationHandlers import
import { authHandlers } from './handlers/auth.js';

// Add before conversationHandlers registration
await fastify.register(authHandlers);
await fastify.register(conversationHandlers);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/handlers/auth.ts backend/src/index.ts
git commit -m "feat(auth): add Google OAuth handler with PostgreSQL sessions"
```

---

## Task 3: Frontend routing setup

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Install react-router-dom**

Run: `cd frontend && npm install react-router-dom`

- [ ] **Step 2: Update main.tsx with Router**

```typescript
// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 3: Update App.tsx with Routes**

```typescript
// frontend/src/App.tsx
import { Routes, Route } from 'react-router-dom'
// ... existing imports
import AuthCallback from './pages/AuthCallback'

function App() {
  // ... existing state and logic

  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  )
}

// Extract existing App content to MainApp component
// ... existing handlers
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/main.tsx frontend/src/App.tsx frontend/package.json
git commit -m "feat(frontend): add react-router-dom routing"
```

---

## Task 4: Frontend AuthCallback page

**Files:**
- Create: `frontend/src/pages/AuthCallback.tsx`

- [ ] **Step 1: Write AuthCallback page**

```typescript
// frontend/src/pages/AuthCallback.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const exchangeToken = async () => {
      // Extract code and state from hash
      const hash = window.location.hash.slice(1) // remove #
      const params = new URLSearchParams(hash)
      const code = params.get('code')
      const state = params.get('state')

      if (!code) {
        alert('OAuth failed: no code returned')
        navigate('/')
        return
      }

      try {
        const res = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        })

        const data = await res.json()

        if (data.session_token) {
          localStorage.setItem('council_session_token', data.session_token)
          window.location.hash = '' // clear hash
          navigate('/')
        } else {
          alert('OAuth failed: ' + (data.error || 'unknown error'))
          navigate('/')
        }
      } catch (e) {
        console.error('OAuth callback error:', e)
        alert('OAuth failed')
        navigate('/')
      }
    }

    exchangeToken()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-stone-600">登录中...</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create pages directory**

```bash
mkdir -p frontend/src/pages
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AuthCallback.tsx
git commit -m "feat(frontend): add OAuth callback page"
```

---

## Task 5: Update useAuth hook

**Files:**
- Modify: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Update useAuth**

```typescript
// frontend/src/hooks/useAuth.ts
import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name?: string
  picture?: string
}

const SESSION_KEY = 'council_session_token'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY)
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          'X-Session-Token': token,
        },
      })
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('not authorized')
        })
        .then(data => {
          if (data.user) {
            setUser(data.user)
          } else {
            localStorage.removeItem(SESSION_KEY)
          }
          setLoading(false)
        })
        .catch(() => {
          localStorage.removeItem(SESSION_KEY)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = () => {
    window.location.href = '/api/auth/google'
  }

  const logout = async () => {
    const token = localStorage.getItem(SESSION_KEY)
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-Session-Token': token },
      })
    }
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return { user, loading, login, logout }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useAuth.ts
git commit -m "feat(frontend): update useAuth for new session flow"
```

---

## Task 6: Update .env.example

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: Add Google OAuth vars**

Add to `backend/.env.example`:

```
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/#/auth/callback

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/council
```

- [ ] **Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "chore: add Google OAuth and DB env vars to .env.example"
```

---

## Self-Review Checklist

1. **Spec coverage:** All endpoints from design doc (`/auth/google`, `/auth/callback`, `/auth/me`, `/auth/logout`) implemented ✓
2. **Placeholder scan:** No TBD/TODO ✓
3. **Type consistency:** Session interface matches between db/session.ts and handlers/auth.ts ✓

---

## Local Dev Verification

```bash
# 1. Start postgres
docker-compose up -d

# 2. Fill in .env with real Google OAuth credentials

# 3. Add redirect URI in Google Cloud Console:
#    http://localhost:5173/#/auth/callback

# 4. Start backend
cd backend && npm run dev

# 5. Start frontend
cd frontend && npm run dev

# 6. Visit http://localhost:5173, click "使用 Google 登录"
```