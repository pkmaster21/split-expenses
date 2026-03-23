import { buildApp } from './app.js';

const port = parseInt(process.env['PORT'] ?? '3001', 10);

const app = await buildApp();

const shutdown = async () => {
  await app.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API listening on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
