import Fastify from 'fastify';
import cors from '@fastify/cors';
import { conversationHandlers } from './handlers/conversation.js';

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: true
});

await fastify.register(conversationHandlers);

fastify.get('/health', async () => {
  return { status: 'ok' };
});

const port = parseInt(process.env.PORT || '3001');
await fastify.listen({ port, host: '0.0.0.0' });

console.log(`Council backend running on port ${port}`);