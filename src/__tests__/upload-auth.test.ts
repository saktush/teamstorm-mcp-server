import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config.js', () => ({
  getApiToken: vi.fn(),
}));

import { validateUploadAuth } from '../utils/upload-auth.js';
import { getApiToken } from '../config.js';

function makeReq(authorization?: string): any {
  return { headers: authorization ? { authorization } : {} };
}

describe('validateUploadAuth', () => {
  beforeEach(() => {
    vi.mocked(getApiToken).mockReset();
  });

  describe('server token not configured', () => {
    beforeEach(() => {
      vi.mocked(getApiToken).mockReturnValue(undefined);
    });

    it('rejects any Bearer token — core security fix', () => {
      const result = validateUploadAuth(makeReq('Bearer anything'));
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/valid token required/);
    });

    it('rejects PrivateToken header', () => {
      const result = validateUploadAuth(makeReq('PrivateToken anything'));
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/valid token required/);
    });

    it('rejects missing header', () => {
      expect(validateUploadAuth(makeReq()).ok).toBe(false);
    });
  });

  describe('server token configured', () => {
    beforeEach(() => {
      vi.mocked(getApiToken).mockReturnValue('s3cr3t');
    });

    it('accepts Bearer with correct token', () => {
      expect(validateUploadAuth(makeReq('Bearer s3cr3t')).ok).toBe(true);
    });

    it('accepts PrivateToken with correct token', () => {
      expect(validateUploadAuth(makeReq('PrivateToken s3cr3t')).ok).toBe(true);
    });

    it('accepts case-insensitive scheme prefix', () => {
      expect(validateUploadAuth(makeReq('bearer s3cr3t')).ok).toBe(true);
    });

    it('rejects wrong token', () => {
      const result = validateUploadAuth(makeReq('Bearer wrong'));
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/valid token required/);
    });

    it('rejects missing header', () => {
      expect(validateUploadAuth(makeReq()).ok).toBe(false);
    });

    it('rejects header without scheme prefix', () => {
      expect(validateUploadAuth(makeReq('s3cr3t')).ok).toBe(false);
    });
  });
});
