import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  CreateKeywordRequest,
  CreateSeoProjectRequest,
  UpdateKeywordRequest,
} from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Env } from '../../config/config.schema.js';

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
  ) {}

  private redirectUri(): string {
    return `${this.config.get('API_URL', { infer: true })}/v1/integrations/google/callback`;
  }

  /** Build the Google consent URL to connect a project to Search Console. */
  async connectUrl(organizationId: string, id: string): Promise<{ url: string }> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true }) as string | undefined;
    if (!clientId) {
      throw new BadRequestException({
        title: 'Google not configured',
        message: 'Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to .env (see docs/23).',
      });
    }
    await this.get(organizationId, id);
    // Signed state carries the tenant + project so the public callback can trust it.
    const state = await this.jwt.signAsync(
      { org: organizationId, seoProjectId: id },
      { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: 600 },
    );
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: GSC_SCOPE,
      state,
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  }

  /** OAuth callback: exchange the code for tokens and store them on the project. */
  async handleGoogleCallback(code: string, state: string): Promise<string> {
    let payload: { org: string; seoProjectId: string };
    try {
      payload = await this.jwt.verifyAsync(state, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new BadRequestException('Invalid or expired state');
    }

    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true }) as string;
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }) as string;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: this.redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) {
      this.logger.error(`Google token exchange failed: ${await res.text()}`);
      throw new BadRequestException('Google token exchange failed');
    }
    const tokens = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const db = this.prisma.forTenant(payload.org);
    await db.seoProject.update({
      where: { id: payload.seoProjectId },
      data: {
        gscConnected: true,
        gscAccessToken: tokens.access_token,
        ...(tokens.refresh_token ? { gscRefreshToken: tokens.refresh_token } : {}),
        gscTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return `${this.config.get('WEB_URL', { infer: true })}/seo/${payload.seoProjectId}?connected=1`;
  }

  private async freshAccessToken(project: {
    id: string;
    organizationId: string;
    gscAccessToken: string | null;
    gscRefreshToken: string | null;
    gscTokenExpiry: Date | null;
  }): Promise<string> {
    if (project.gscTokenExpiry && project.gscTokenExpiry.getTime() > Date.now() + 60_000) {
      return project.gscAccessToken!;
    }
    if (!project.gscRefreshToken) throw new BadRequestException('Reconnect Google to continue');
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true }) as string,
        client_secret: this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }) as string,
        refresh_token: project.gscRefreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw new BadRequestException('Google token refresh failed');
    const tokens = (await res.json()) as { access_token: string; expires_in: number };
    const db = this.prisma.forTenant(project.organizationId);
    await db.seoProject.update({
      where: { id: project.id },
      data: {
        gscAccessToken: tokens.access_token,
        gscTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return tokens.access_token;
  }

  /** Pull top queries from Search Console and upsert them as keywords. */
  async sync(organizationId: string, id: string): Promise<{ synced: number }> {
    const db = this.prisma.forTenant(organizationId);
    const project = await db.seoProject.findFirst({ where: { id, deletedAt: null } });
    if (!project) throw new NotFoundException('SEO project not found');
    if (!project.gscConnected) throw new BadRequestException('Connect Google Search Console first');

    const accessToken = await this.freshAccessToken(project);
    const end = new Date();
    const start = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(project.siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          startDate: iso(start),
          endDate: iso(end),
          dimensions: ['query'],
          rowLimit: 25,
        }),
      },
    );
    if (!res.ok) {
      this.logger.error(`GSC query failed: ${await res.text()}`);
      throw new BadRequestException(
        'Search Console query failed — check the site is verified in your Google account.',
      );
    }
    const data = (await res.json()) as {
      rows?: { keys: string[]; clicks: number; impressions: number; position: number }[];
    };

    let synced = 0;
    for (const row of data.rows ?? []) {
      const term = row.keys[0] ?? '';
      if (!term) continue;
      const existing = await db.keyword.findFirst({ where: { seoProjectId: id, term } });
      const values = {
        position: Math.round(row.position),
        clicks: Math.round(row.clicks),
        impressions: Math.round(row.impressions),
      };
      if (existing) await db.keyword.update({ where: { id: existing.id }, data: values });
      else await db.keyword.create({ data: { organizationId, seoProjectId: id, term, ...values } });
      synced++;
    }
    return { synced };
  }

  async list(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.seoProject.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { keywords: true } } },
    });
  }

  async get(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const project = await db.seoProject.findFirst({
      where: { id, deletedAt: null },
      include: { keywords: { orderBy: { position: 'asc' } } },
    });
    if (!project) throw new NotFoundException('SEO project not found');
    return project;
  }

  async create(organizationId: string, dto: CreateSeoProjectRequest) {
    const db = this.prisma.forTenant(organizationId);
    return db.seoProject.create({
      data: {
        organizationId,
        name: dto.name,
        siteUrl: dto.siteUrl,
        customerId: dto.customerId ?? null,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    await db.seoProject.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  async addKeyword(organizationId: string, dto: CreateKeywordRequest) {
    await this.get(organizationId, dto.seoProjectId);
    const db = this.prisma.forTenant(organizationId);
    return db.keyword.create({
      data: {
        organizationId,
        seoProjectId: dto.seoProjectId,
        term: dto.term,
        position: dto.position ?? null,
      },
    });
  }

  async updateKeyword(organizationId: string, id: string, dto: UpdateKeywordRequest) {
    const db = this.prisma.forTenant(organizationId);
    const keyword = await db.keyword.findFirst({ where: { id } });
    if (!keyword) throw new NotFoundException('Keyword not found');
    return db.keyword.update({ where: { id }, data: dto });
  }

  async removeKeyword(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const keyword = await db.keyword.findFirst({ where: { id } });
    if (!keyword) throw new NotFoundException('Keyword not found');
    await db.keyword.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Capture a point-in-time snapshot of every keyword's current metrics. */
  async snapshotKeywords(organizationId: string): Promise<{ captured: number }> {
    const db = this.prisma.forTenant(organizationId);
    const keywords = await db.keyword.findMany({
      select: { id: true, position: true, clicks: true, impressions: true },
    });
    if (keywords.length === 0) return { captured: 0 };
    await db.keywordSnapshot.createMany({
      data: keywords.map((k) => ({
        organizationId,
        keywordId: k.id,
        position: k.position,
        clicks: k.clicks,
        impressions: k.impressions,
      })),
    });
    return { captured: keywords.length };
  }

  /** Position history for one keyword (oldest → newest), for trend charts. */
  async keywordHistory(organizationId: string, id: string, limit = 30) {
    const db = this.prisma.forTenant(organizationId);
    const keyword = await db.keyword.findFirst({ where: { id } });
    if (!keyword) throw new NotFoundException('Keyword not found');
    const rows = await db.keywordSnapshot.findMany({
      where: { keywordId: id },
      orderBy: { capturedAt: 'desc' },
      take: Math.min(limit, 90),
      select: { position: true, clicks: true, impressions: true, capturedAt: true },
    });
    return rows.reverse();
  }

  // ─────────────── Competitors ───────────────

  async listCompetitors(organizationId: string, seoProjectId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.competitor.findMany({ where: { seoProjectId }, orderBy: { createdAt: 'desc' } });
  }

  async addCompetitor(
    organizationId: string,
    dto: { seoProjectId: string; name: string; url: string; notes?: string },
  ) {
    const db = this.prisma.forTenant(organizationId);
    const project = await db.seoProject.findFirst({ where: { id: dto.seoProjectId, deletedAt: null } });
    if (!project) throw new NotFoundException('SEO project not found');
    return db.competitor.create({
      data: {
        organizationId,
        seoProjectId: dto.seoProjectId,
        name: dto.name,
        url: dto.url,
        notes: dto.notes ?? null,
      },
    });
  }

  async removeCompetitor(organizationId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const c = await db.competitor.findFirst({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Competitor not found');
    await db.competitor.delete({ where: { id } });
    return { ok: true };
  }

  // ─────────────── On-page audit (in-app crawler) ───────────────

  async auditUrl(url: string) {
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    let status = 0;
    let html = '';
    try {
      const res = await fetch(target, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'user-agent': 'GnevoCRM-SEO-Audit/1.0' },
      });
      status = res.status;
      html = await res.text();
    } catch (e) {
      throw new BadRequestException(`Could not fetch the page: ${(e as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    const pick = (re: RegExp) => (html.match(re)?.[1] ?? '').trim();
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescription =
      pick(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
      pick(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
      m[1]!.replace(/<[^>]+>/g, '').trim(),
    );
    const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([\s\S]*?)["']/i);
    const robots = pick(/<meta[^>]+name=["']robots["'][^>]+content=["']([\s\S]*?)["']/i);
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
    const imgsMissingAlt = imgs.filter((m) => !/\balt\s*=\s*["'][^"']+["']/i.test(m[0]!)).length;
    const linkCount = [...html.matchAll(/<a\b[^>]+href=/gi)].length;

    const issues: string[] = [];
    if (status >= 400) issues.push(`Page returned HTTP ${status}`);
    if (!title) issues.push('Missing <title>');
    else if (title.length > 60) issues.push(`Title is long (${title.length} chars; aim ≤ 60)`);
    if (!metaDescription) issues.push('Missing meta description');
    else if (metaDescription.length > 160) issues.push(`Meta description is long (${metaDescription.length} chars; aim ≤ 160)`);
    if (h1s.length === 0) issues.push('No <h1> found');
    else if (h1s.length > 1) issues.push(`Multiple <h1> tags (${h1s.length})`);
    if (!canonical) issues.push('No canonical tag');
    if (imgsMissingAlt > 0) issues.push(`${imgsMissingAlt} image(s) missing alt text`);
    if (wordCount < 300) issues.push(`Thin content (${wordCount} words)`);

    return {
      url: target,
      status,
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      h1s,
      canonical,
      robots,
      wordCount,
      imageCount: imgs.length,
      imagesMissingAlt: imgsMissingAlt,
      linkCount,
      issues,
    };
  }
}
