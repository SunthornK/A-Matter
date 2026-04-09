import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  jwtTtlSeconds: 60 * 15, // 15 minutes
  bcryptRounds: 10,
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
}
