import type { FastifyInstance } from 'fastify';
import { initSessionTable, createSession, getSession, deleteSession } from '../db/session.js';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
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
  try {
    await initSessionTable();
    fastify.log.info('Session table initialized');
  } catch (e) {
    fastify.log.error({ err: e }, 'Failed to initialize session table');
  }

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

    reply.setCookie('oauth_state', state, {
      path: '/',
      httpOnly: true,
      maxAge: 3600,
      sameSite: 'lax',
    });

    return reply.redirect(url.toString());
  });

  fastify.post('/auth/callback', async (request, reply) => {
    const { code, state } = request.body as { code: string; state: string };

    const savedState = request.cookies['oauth_state'];
    if (!state || state !== savedState) {
      return reply.status(401).send({ error: 'Invalid state' });
    }

    reply.clearCookie('oauth_state', { path: '/' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/#/auth/callback';

    if (!clientId || !clientSecret) {
      return reply.status(500).send({ error: 'Google OAuth not configured' });
    }

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
      fastify.log.error({ err }, 'Google token exchange failed');
      return reply.status(401).send({ error: 'OAuth exchange failed' });
    }

    const tokenData: GoogleTokenResponse = await tokenRes.json();

    const payload = JSON.parse(Buffer.from(tokenData.id_token!.split('.')[1], 'base64').toString());
    const userInfo: GoogleUserInfo = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

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

  fastify.post('/auth/logout', async (request, reply) => {
    const token = request.headers['x-session-token'] as string;
    if (token) {
      await deleteSession(token);
    }
    return { success: true };
  });

  fastify.post('/auth/dev-login', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Dev login disabled in production' });
    }

    const { email, name, picture } = request.body as { email: string; name?: string; picture?: string };

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await createSession({
      id: sessionId,
      user_id: `dev_${Date.now()}`,
      email: email || 'dev@localhost',
      name: name || 'Local Dev User',
      picture: picture || null,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    return {
      session_token: sessionId,
      user: {
        id: `dev_${Date.now()}`,
        email: email || 'dev@localhost',
        name: name || 'Local Dev User',
        picture: picture || null,
      },
    };
  });
}