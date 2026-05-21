process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '3001';
process.env.HOST = process.env.HOST ?? '127.0.0.1';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'fatal';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-1234';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? '*';
process.env.ENABLE_SWAGGER = process.env.ENABLE_SWAGGER ?? 'false';

if (process.env.INTEGRATION_TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.INTEGRATION_TEST_DATABASE_URL;
} else {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    'postgresql://user:pass@localhost:5432/test?schema=public';
}
