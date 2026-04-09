import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface TokenPayload {
  user_id: string
  role: 'user' | 'admin'
  token_version: number
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptRounds)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function signToken(
  payload: TokenPayload,
  secret: string,
  ttlSeconds: number,
): string {
  return jwt.sign(payload, secret, { expiresIn: ttlSeconds })
}

export function verifyTokenPayload(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret)
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>)['user_id'] !== 'string' ||
    typeof (decoded as Record<string, unknown>)['token_version'] !== 'number'
  ) {
    throw new Error('Invalid token payload shape')
  }
  return decoded as TokenPayload
}
