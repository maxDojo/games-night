// Provide a sane env *before* `src/config/env.ts` is imported by any test.
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.HOST = '127.0.0.1';
process.env.LOG_LEVEL = 'fatal';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test?schema=public';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGINS = '*';
process.env.ENABLE_SWAGGER = 'false';
