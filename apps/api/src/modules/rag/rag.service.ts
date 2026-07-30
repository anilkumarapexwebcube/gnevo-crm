import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { embed, AiError, cosineSimilarity, type EmbeddingProvider } from '@gnevo/ai';
import { PrismaService } from '../../prisma/prisma.service.js';

interface Embedder {
  provider: EmbeddingProvider;
  apiKey: string;
  model: string;
  tag: string;
}

interface Doc {
  entityType: string;
  entityId: string;
  title: string;
  content: string;
  link: string;
}

const strip = (s: string | null | undefined) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const MAX_DOCS = 600;

@Injectable()
export class RagService {
  constructor(private readonly prisma: PrismaService) {}

  /** Embedding providers in priority order (only those with a key). */
  private candidates(): Embedder[] {
    const list: Embedder[] = [];
    const oa = process.env.OPENAI_API_KEY?.trim();
    const ga = process.env.GOOGLE_AI_API_KEY?.trim();
    if (oa) list.push({ provider: 'openai', apiKey: oa, model: 'text-embedding-3-small', tag: 'openai:text-embedding-3-small' });
    if (ga) list.push({ provider: 'gemini', apiKey: ga, model: 'gemini-embedding-001', tag: 'gemini:gemini-embedding-001' });
    return list;
  }

  /**
   * Embed with automatic fallback: tries each configured provider in order and
   * uses the first that succeeds (so a quota-exhausted OpenAI key falls back to
   * Gemini). Returns the vectors + a `tag` identifying the model used, so the
   * index and query stay on the same model.
   */
  private async embedBatch(input: string[]): Promise<{ vectors: number[][]; tag: string }> {
    const cands = this.candidates();
    if (cands.length === 0) {
      throw new BadRequestException({
        title: 'No embedding provider configured',
        message: 'Semantic search needs an OpenAI or Google AI key in .env (OPENAI_API_KEY or GOOGLE_AI_API_KEY).',
      });
    }
    let lastError = '';
    for (const c of cands) {
      try {
        const vectors = await embed({ provider: c.provider, apiKey: c.apiKey, model: c.model, input });
        if (vectors.length > 0 && (vectors[0]?.length ?? 0) > 0) return { vectors, tag: c.tag };
        lastError = `${c.provider}: returned no embeddings`;
      } catch (e) {
        lastError = e instanceof AiError ? `${c.provider}: ${e.message}` : `${c.provider}: request failed`;
      }
    }
    throw new ServiceUnavailableException({ title: 'Embedding failed', message: lastError });
  }

  private async gather(db: ReturnType<PrismaService['forTenant']>): Promise<Doc[]> {
    const [leads, customers, deals, tickets, articles, notes] = await Promise.all([
      db.lead.findMany({ where: { deletedAt: null }, take: 200, select: { id: true, name: true, email: true, company: true, status: true, source: true } }),
      db.customer.findMany({ where: { deletedAt: null }, take: 200, select: { id: true, name: true, industry: true, website: true, status: true } }),
      db.deal.findMany({ where: { deletedAt: null }, take: 200, select: { id: true, title: true, value: true, status: true } }),
      db.ticket.findMany({ where: { deletedAt: null }, take: 200, select: { id: true, subject: true, description: true, status: true } }),
      db.article.findMany({ take: 200, select: { id: true, title: true, body: true, category: true } }),
      db.note.findMany({ take: 200, orderBy: { createdAt: 'desc' }, select: { id: true, body: true, kind: true, entityType: true, entityId: true } }),
    ]);

    const docs: Doc[] = [];
    for (const l of leads)
      docs.push({ entityType: 'lead', entityId: l.id, title: l.name, link: `/leads/${l.id}`, content: `Lead: ${l.name}. Company: ${l.company ?? '-'}. Email: ${l.email ?? '-'}. Status: ${l.status}. Source: ${l.source ?? '-'}.` });
    for (const c of customers)
      docs.push({ entityType: 'customer', entityId: c.id, title: c.name, link: `/customers/${c.id}`, content: `Customer: ${c.name}. Industry: ${c.industry ?? '-'}. Website: ${c.website ?? '-'}. Status: ${c.status}.` });
    for (const d of deals)
      docs.push({ entityType: 'deal', entityId: d.id, title: d.title, link: `/deals`, content: `Deal: ${d.title}. Value: ${Number(d.value)}. Status: ${d.status}.` });
    for (const t of tickets)
      docs.push({ entityType: 'ticket', entityId: t.id, title: t.subject, link: `/tickets/${t.id}`, content: `Ticket: ${t.subject}. ${strip(t.description)}. Status: ${t.status}.` });
    for (const a of articles)
      docs.push({ entityType: 'article', entityId: a.id, title: a.title, link: `/kb/${a.id}`, content: `Article (${a.category ?? 'general'}): ${a.title}. ${strip(a.body).slice(0, 1000)}` });
    for (const n of notes) {
      const link =
        n.entityType === 'lead' || n.entityType === 'customer'
          ? `/${n.entityType}s/${n.entityId}`
          : '/activity';
      docs.push({ entityType: 'note', entityId: n.id, title: `Note (${n.kind})`, link, content: `Note: ${strip(n.body).slice(0, 500)}` });
    }
    return docs.slice(0, MAX_DOCS);
  }

  /** Rebuild the embedding index for the whole workspace. */
  async reindex(organizationId: string): Promise<{ indexed: number; model: string }> {
    const db = this.prisma.forTenant(organizationId);
    const docs = await this.gather(db);
    if (docs.length === 0) return { indexed: 0, model: '' };

    // Embed in batches to stay within request limits.
    const BATCH = 64;
    let indexed = 0;
    let usedTag = '';
    for (let i = 0; i < docs.length; i += BATCH) {
      const chunk = docs.slice(i, i + BATCH);
      const { vectors, tag } = await this.embedBatch(chunk.map((d) => `${d.title}\n${d.content}`));
      usedTag = tag;
      for (let j = 0; j < chunk.length; j++) {
        const d = chunk[j]!;
        const vector = vectors[j] ?? [];
        if (vector.length === 0) continue;
        await db.embedding.upsert({
          where: { organizationId_entityType_entityId: { organizationId, entityType: d.entityType, entityId: d.entityId } },
          create: { organizationId, entityType: d.entityType, entityId: d.entityId, title: d.title, content: d.content, link: d.link, vector, model: tag },
          update: { title: d.title, content: d.content, link: d.link, vector, model: tag },
        });
        indexed += 1;
      }
    }

    // Drop stale rows no longer present in the current document set.
    const liveKeys = new Set(docs.map((d) => `${d.entityType}:${d.entityId}`));
    const existing = await db.embedding.findMany({ select: { id: true, entityType: true, entityId: true } });
    const staleIds = existing.filter((e) => !liveKeys.has(`${e.entityType}:${e.entityId}`)).map((e) => e.id);
    if (staleIds.length) await db.embedding.deleteMany({ where: { id: { in: staleIds } } });

    return { indexed, model: usedTag };
  }

  async search(organizationId: string, q: string, limit = 8) {
    const query = q.trim();
    if (!query) return { results: [], indexed: 0 };
    const db = this.prisma.forTenant(organizationId);

    const rows = await db.embedding.findMany({
      select: { entityType: true, entityId: true, title: true, content: true, link: true, vector: true, model: true },
    });
    if (rows.length === 0) return { results: [], indexed: 0 };

    const { vectors, tag } = await this.embedBatch([query]);
    const qVec = vectors[0];
    if (!qVec) return { results: [], indexed: rows.length };

    // Only compare against rows embedded with the same model (dims must match).
    const comparable = rows.filter((r) => r.model === tag);
    const pool = comparable.length > 0 ? comparable : rows;

    const scored = pool
      .map((r) => ({
        entityType: r.entityType,
        entityId: r.entityId,
        title: r.title,
        snippet: r.content.slice(0, 200),
        link: r.link,
        score: cosineSimilarity(qVec, r.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { results: scored, indexed: rows.length };
  }

  async status(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const indexed = await db.embedding.count();
    const configured = this.candidates().length > 0;
    return { indexed, configured };
  }
}
