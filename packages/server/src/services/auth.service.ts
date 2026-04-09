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
  return jwt.verify(token, secret) as TokenPayload
}
