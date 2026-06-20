import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/conversation.js';
import { authHandlers } from './handlers/auth.js';
import { conversationHandlers } from './handlers/conversation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: process.env.NODE_ENV === 'production' ? undefined : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname,reqId',
      }
    }
  }
});

await fastify.register(cors, {
  origin: true
});

await fastify.register(cookie);

// Serve frontend static files
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/dist'),
  prefix: '/',
  decorateReply: false
});

// API routes
await fastify.register(authHandlers, { prefix: '/api' });
await fastify.register(conversationHandlers, { prefix: '/api' });

fastify.get('/health', async () => {
  return { status: 'ok' };
});

// SPA fallback: serve index.html for non-API, non-static routes
fastify.setErrorHandler(async (error: { statusCode?: number; message?: string }, request, reply) => {
  if (error.statusCode === 404 && !request.url.startsWith('/api/')) {
    return reply.sendFile('index.html');
  }
  reply.status(error.statusCode || 500).send(error.message);
});

const port = parseInt(process.env.PORT || '3001');

// Auto-migrate DB before serving
await initDb();

await fastify.listen({ port, host: '0.0.0.0' });

console.log(`Council backend running on port ${port}`);