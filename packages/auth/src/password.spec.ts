import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('CorrectHorse1!');
    expect(await verifyPassword('CorrectHorse1!', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('CorrectHorse1!');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces a unique salt each time', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toEqual(b);
  });

  it('rejects a malformed stored hash', async () => {
    expect(await verifyPassword('x', 'not-a-valid-hash')).toBe(false);
  });
});
