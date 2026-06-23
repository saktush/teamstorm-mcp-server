import { timingSafeEqual, createHash } from 'node:crypto';
import type { Request } from 'express';
import { getApiToken } from '../config.js';

export function validateUploadAuth(req: Request): { ok: boolean; reason?: string } {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const expected = getApiToken();
  if (!authHeader || typeof authHeader !== 'string') return { ok: false, reason: 'Unauthorized: valid token required for uploads' };
  const match = authHeader.match(/^(?:Bearer|PrivateToken)\s+(.+)$/i);
  if (!match) return { ok: false, reason: 'Unauthorized: valid token required for uploads' };
  if (expected === undefined) return { ok: false, reason: 'Unauthorized: server TEAMSTORM_API_TOKEN is not configured' };
  const incoming = createHash('sha256').update(match[1]).digest();
  const secret   = createHash('sha256').update(expected).digest();
  if (!timingSafeEqual(incoming, secret)) return { ok: false, reason: 'Unauthorized: invalid token' };
  return { ok: true };
}
