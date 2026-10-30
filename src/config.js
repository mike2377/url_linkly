import 'dotenv/config'
import { z } from 'zod'

// define the require environnment variables and validate
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().min(1).optional()
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const env = parsed.data

// use the test database auto
const databaseUrl = env.NODE_ENV === 'test' && env.TEST_DATABASE_URL ? env.TEST_DATABASE_URL : env.DATABASE_URL

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl
}
