import { describe, expect, it } from 'vitest';
import { generatePassword, hashPassword, verifyPassword } from '../src/server/auth/passwords.js';

describe('passwords', () => {
  it('hashes and verifies a password', () => {
    const hash = hashPassword('correct horse battery staple');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const hash = hashPassword('secret-123');
    expect(verifyPassword('secret-124', hash)).toBe(false);
  });

  it('rejects malformed hashes', () => {
    expect(verifyPassword('secret', 'not-a-hash')).toBe(false);
    expect(verifyPassword('secret', 'scrypt$1$2$3$zz$zz')).toBe(false);
  });

  it('generates passwords with the requested length', () => {
    expect(generatePassword(12)).toHaveLength(12);
    expect(generatePassword(20)).not.toBe(generatePassword(20));
  });
});
