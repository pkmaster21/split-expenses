if (!process.env['TEST_DATABASE_URL']) {
  throw new Error('TEST_DATABASE_URL must be set — point it at the Neon tabby_test database');
}
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'];
process.env['NODE_ENV'] = 'test';
process.env['COOKIE_SECRET'] = 'test-secret-for-vitest';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
