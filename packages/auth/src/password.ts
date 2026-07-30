import {
  randomBytes,
  scrypt as scryptCb,
  type ScryptOptions,
  timingSafeEqual,
} from 'node:crypto';

/** Promise wrapper that preserves the options overload (promisify drops it). */
function scrypt(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

const KEYLEN = 64;
const COST = 2 ** 15; // N
const BLOCK_SIZE = 8; // r
const PARALLELIZATION = 1; // p

/**
 * Password hashing using Node's built-in scrypt — zero native deps, works
 * everywhere (incl. Windows CI). Format: `scrypt$N$r$p$salt$hash` (hex).
 *
 * NOTE: for production at scale, consider argon2id (@node-rs/argon2). This is a
 * dependency-free default suitable for the skeleton; the interface is stable so
 * swapping the implementation later won't touch callers.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(plain, salt, KEYLEN, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 128 * COST * BLOCK_SIZE * 2,
  })) as Buffer;
  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('hex'),
    derived.toString('hex'),
  ].join('$');
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex!, 'hex');
  const expected = Buffer.from(hashHex!, 'hex');
  const derived = (await scrypt(plain, salt, expected.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
    maxmem: 128 * Number(nStr) * Number(rStr) * 2,
  })) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
