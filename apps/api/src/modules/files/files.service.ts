import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../events/activity.service.js';
import { AuditService } from '../events/audit.service.js';

/** Max upload size. DB (bytea) storage keeps this self-contained (no paid object
 *  store); production should swap to S3/R2 and raise this. */
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/** Only business-relevant document/image types — never executables/scripts. */
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'txt',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'zip',
]);
export const ALLOWED_UPLOAD_LABEL = 'PDF, Word, Excel, PowerPoint, CSV, TXT, images, ZIP';

export interface UploadFileInput {
  name: string;
  mimeType?: string;
  dataBase64: string;
  entityType?: string;
  entityId?: string;
}

const FILE_META = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  uploaderName: true,
  version: true,
  versionOf: true,
  entityType: true,
  entityId: true,
  createdAt: true,
} as const;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly audit: AuditService,
  ) {}

  async upload(
    organizationId: string,
    uploader: { id?: string; name?: string },
    dto: UploadFileInput,
  ) {
    const ext = dto.name.includes('.') ? dto.name.split('.').pop()!.toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File type not allowed. Allowed types: ${ALLOWED_UPLOAD_LABEL}.`);
    }

    const buf = Buffer.from(dto.dataBase64, 'base64');
    if (buf.length === 0) throw new BadRequestException('The file appears to be empty');
    if (buf.length > MAX_BYTES) throw new BadRequestException('File exceeds the 8 MB limit');

    const db = this.prisma.forTenant(organizationId);
    const file = await db.fileAsset.create({
      data: {
        organizationId,
        uploaderId: uploader.id ?? null,
        uploaderName: uploader.name || null,
        name: dto.name,
        mimeType: dto.mimeType || 'application/octet-stream',
        size: buf.length,
        data: buf,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
      },
      select: FILE_META,
    });

    if (dto.entityType && dto.entityId) {
      await this.activity.log(organizationId, {
        verb: 'uploaded',
        entityType: dto.entityType,
        entityId: dto.entityId,
        summary: `File "${dto.name}" was uploaded`,
      });
    }
    return file;
  }

  async list(organizationId: string, entityType?: string, entityId?: string) {
    const db = this.prisma.forTenant(organizationId);
    const rows = await db.fileAsset.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: FILE_META,
    });
    // Collapse version groups → show only the latest version of each file,
    // with a count of how many versions exist.
    const groups = new Map<string, { latest: (typeof rows)[number]; count: number }>();
    for (const r of rows) {
      const key = r.versionOf ?? r.id;
      const g = groups.get(key);
      if (!g) groups.set(key, { latest: r, count: 1 });
      else {
        g.count += 1;
        if (r.version > g.latest.version) g.latest = r;
      }
    }
    return Array.from(groups.values())
      .map((g) => ({ ...g.latest, versionCount: g.count }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /** All versions of a file (newest first), given any version's id. */
  async versions(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const file = await db.fileAsset.findFirst({ where: { id }, select: { id: true, versionOf: true } });
    if (!file) throw new NotFoundException('File not found');
    const rootId = file.versionOf ?? file.id;
    return db.fileAsset.findMany({
      where: { OR: [{ id: rootId }, { versionOf: rootId }] },
      orderBy: { version: 'desc' },
      select: FILE_META,
    });
  }

  /** Upload a new version of an existing file (keeps history + same attachment). */
  async uploadVersion(
    organizationId: string,
    uploader: { id?: string; name?: string },
    id: string,
    dto: { name?: string; mimeType?: string; dataBase64: string },
  ) {
    const db = this.prisma.forTenant(organizationId);
    const current = await db.fileAsset.findFirst({ where: { id } });
    if (!current) throw new NotFoundException('File not found');
    const rootId = current.versionOf ?? current.id;

    const name = dto.name ?? current.name;
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File type not allowed. Allowed types: ${ALLOWED_UPLOAD_LABEL}.`);
    }
    const buf = Buffer.from(dto.dataBase64, 'base64');
    if (buf.length === 0) throw new BadRequestException('The file appears to be empty');
    if (buf.length > MAX_BYTES) throw new BadRequestException('File exceeds the 8 MB limit');

    const agg = await db.fileAsset.aggregate({
      where: { OR: [{ id: rootId }, { versionOf: rootId }] },
      _max: { version: true },
    });
    const nextVersion = (agg._max.version ?? current.version) + 1;

    const file = await db.fileAsset.create({
      data: {
        organizationId,
        uploaderId: uploader.id ?? null,
        uploaderName: uploader.name || null,
        name,
        mimeType: dto.mimeType || current.mimeType,
        size: buf.length,
        data: buf,
        version: nextVersion,
        versionOf: rootId,
        entityType: current.entityType,
        entityId: current.entityId,
      },
      select: FILE_META,
    });

    if (current.entityType && current.entityId) {
      await this.activity.log(organizationId, {
        verb: 'uploaded',
        entityType: current.entityType,
        entityId: current.entityId,
        summary: `File "${name}" updated to v${nextVersion}`,
      });
    }
    return file;
  }

  /** Convert a .docx to sanitized-ready HTML for inline preview (browsers can't
   *  render Word natively). Other Office formats have no inline preview. */
  async previewHtml(organizationId: string, id: string): Promise<{ html: string }> {
    const db = this.prisma.forTenant(organizationId);
    const file = await db.fileAsset.findFirst({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
    if (ext !== 'docx') {
      throw new BadRequestException('Inline preview is only available for .docx files');
    }
    try {
      const result = await mammoth.convertToHtml({ buffer: Buffer.from(file.data) });
      return { html: result.value || '<p>(empty document)</p>' };
    } catch {
      throw new BadRequestException('Could not render this document');
    }
  }

  /** Returns metadata + raw bytes for streaming a download. */
  async download(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const file = await db.fileAsset.findFirst({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async remove(organizationId: string, id: string, actorId?: string) {
    const db = this.prisma.forTenant(organizationId);
    const file = await db.fileAsset.findFirst({
      where: { id },
      select: { id: true, name: true, versionOf: true },
    });
    if (!file) throw new NotFoundException('File not found');
    // Deleting a file removes its entire version history.
    const rootId = file.versionOf ?? file.id;
    await db.fileAsset.deleteMany({ where: { OR: [{ id: rootId }, { versionOf: rootId }] } });
    await this.audit.record(organizationId, {
      actorId,
      action: 'file.deleted',
      resource: 'file',
      resourceId: id,
      before: { name: file.name },
    });
    return { ok: true };
  }
}
