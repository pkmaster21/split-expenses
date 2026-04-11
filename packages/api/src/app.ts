import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import sessionPlugin from './plugins/session.js';
import { groupRoutes } from './routes/groups.js';
import { memberRoutes } from './routes/members.js';
import { expenseRoutes } from './routes/expenses.js';
import { balanceRoutes } from './routes/balances.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: process.env['NODE_ENV'] !== 'test',
  });

  await fastify.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: process.env['COOKIE_SECRET'] ?? 'dev-secret-change-in-production',
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  if (process.env['NODE_ENV'] !== 'prod') {
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'Tabby API',
          version: '1.0.0',
          description: 'No-auth expense splitting API',
        },
        tags: [
          { name: 'groups', description: 'Group operations' },
          { name: 'members', description: 'Member operations' },
          { name: 'expenses', description: 'Expense operations' },
          { name: 'balances', description: 'Balance and settlement operations' },
        ],
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list' },
    });
  }

  await fastify.register(sessionPlugin);

  await fastify.register(groupRoutes);
  await fastify.register(memberRoutes);
  await fastify.register(expenseRoutes);
  await fastify.register(balanceRoutes);

  fastify.get('/health', async () => ({ status: 'ok' }));

  return fastify;
}
