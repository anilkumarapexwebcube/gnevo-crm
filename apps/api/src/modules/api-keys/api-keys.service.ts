import { createHash, randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a key; returns the plaintext ONCE (only its hash is stored). */
  async create(organizationId: string, name: string, createdById?: string) {
    const raw = `gnevo_sk_${randomBytes(24).toString('hex')}`;
    const prefix = raw.slice(0, 16);
    const db = this.prisma.forTenant(organizationId);
    const key = await db.apiKey.create({
      data: { organizationId, name, prefix, keyHash: hashKey(raw), createdById: createdById ?? null },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });
    return { ...key, key: raw };
  }

  async list(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.apiKey.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    });
  }

  async revoke(organizationId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const found = await db.apiKey.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('API key not found');
    await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  /** Validate a raw key (base client — no tenant yet) and return its org. */
  async authenticate(raw: string): Promise<{ organizationId: string; keyId: string } | null> {
    if (!raw.startsWith('gnevo_sk_')) return null;
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashKey(raw) },
      select: { id: true, organizationId: true, revokedAt: true },
    });
    if (!key || key.revokedAt) return null;
    // best-effort last-used stamp
    this.prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
    return { organizationId: key.organizationId, keyId: key.id };
  }
}
