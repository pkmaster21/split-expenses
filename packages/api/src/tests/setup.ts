if (!process.env['DATABASE_URL']) {
  throw new Error('DATABASE_URL must be set');
}
process.env['NODE_ENV'] = 'test';
process.env['COOKIE_SECRET'] = 'test-secret-for-vitest';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
