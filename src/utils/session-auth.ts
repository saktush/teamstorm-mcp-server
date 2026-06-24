import { createHash, timingSafeEqual } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type SessionAuthResult = { ok: true } | { ok: false; status: 401; reason: string };

export function validateSessionToken(
  incomingToken: string,
  expectedHash: string | undefined
): SessionAuthResult {
  if (!expectedHash) {
    return { ok: false, status: 401, reason: 'Session identity not found' };
  }
  if (
    !timingSafeEqual(Buffer.from(hashToken(incomingToken), 'hex'), Buffer.from(expectedHash, 'hex'))
  ) {
    return { ok: false, status: 401, reason: 'Unauthorized: token does not match session' };
  }
  return { ok: true };
}
