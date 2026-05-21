import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('*'),
  SOCKET_PATH: z.string().default('/socket.io'),
  ENABLE_SWAGGER: z.coerce.boolean().default(true),

  // ---- Provider selection ----
  // Free defaults. Swap when ready to upgrade — see README §Providers.
  TRIVIA_PROVIDER: z.enum(['open-trivia-db', 'none']).default('open-trivia-db'),
  AI_PROVIDER: z.enum(['disabled']).default('disabled'),
  ERROR_PROVIDER: z.enum(['disabled']).default('disabled'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
