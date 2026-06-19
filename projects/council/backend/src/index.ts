import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { authHandlers } from './handlers/auth.js';
import { conversationHandlers } from './handlers/conversation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: true
});

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

// Fallback to index.html for SPA routes
fastify.get('*', async (request, reply) => {
  return reply.sendFile('index.html');
});

const port = parseInt(process.env.PORT || '3001');
await fastify.listen({ port, host: '0.0.0.0' });

console.log(`Council backend running on port ${port}`);