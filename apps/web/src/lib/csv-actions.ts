'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/session';
import { toCsv, parseCsv } from '@/lib/csv';

export type CsvEntity = 'leads' | 'customers';

const FIELDS: Record<CsvEntity, string[]> = {
  leads: ['name', 'email', 'phone', 'company', 'source'],
  customers: ['name', 'type', 'industry', 'website'],
};

/** Page through the API (100/page cap) and return header + string rows. */
async function fetchAll(entity: CsvEntity): Promise<{ fields: string[]; rows: string[][] }> {
  const all: Record<string, unknown>[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page++) {
    const url = `/v1/${entity}?limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const res: {
      data: Record<string, unknown>[];
      pagination?: { nextCursor: string | null; hasMore: boolean };
    } = await apiServer(url);
    all.push(...res.data);
    if (!res.pagination?.hasMore || !res.pagination.nextCursor) break;
    cursor = res.pagination.nextCursor;
  }
  const fields = FIELDS[entity];
  const rows = all.map((r) => fields.map((f) => String(r[f] ?? '')));
  return { fields, rows };
}

export async function exportEntityCsv(
  entity: CsvEntity,
): Promise<{ ok: boolean; csv?: string; error?: string }> {
  try {
    const { fields, rows } = await fetchAll(entity);
    return { ok: true, csv: toCsv(fields, rows) };
  } catch {
    return { ok: false, error: 'Export failed. Please try again.' };
  }
}

/** Excel (.xlsx) export as base64. */
export async function exportEntityExcel(
  entity: CsvEntity,
): Promise<{ ok: boolean; base64?: string; error?: string }> {
  try {
    const { fields, rows } = await fetchAll(entity);
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(entity);
    ws.addRow(fields.map((f) => f.toUpperCase()));
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c) => {
      c.width = 22;
    });
    const buf = await wb.xlsx.writeBuffer();
    return { ok: true, base64: Buffer.from(buf).toString('base64') };
  } catch {
    return { ok: false, error: 'Excel export failed. Please try again.' };
  }
}

/** Simple tabular PDF export as base64. */
export async function exportEntityPdf(
  entity: CsvEntity,
): Promise<{ ok: boolean; base64?: string; error?: string }> {
  try {
    const { fields, rows } = await fetchAll(entity);
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const pageW = 595;
    const pageH = 842;
    const margin = 40;
    const lineH = 16;
    let page = doc.addPage([pageW, pageH]);
    let y = pageH - margin;

    page.drawText(`${entity.toUpperCase()} export`, { x: margin, y, size: 14, font: bold });
    y -= lineH * 1.5;

    const drawRow = (cells: string[], f: typeof font, color = rgb(0.1, 0.1, 0.1)) => {
      if (y < margin) {
        page = doc.addPage([pageW, pageH]);
        y = pageH - margin;
      }
      const colW = (pageW - margin * 2) / cells.length;
      cells.forEach((c, i) => {
        const text = c.length > 24 ? `${c.slice(0, 22)}…` : c;
        page.drawText(text, { x: margin + i * colW, y, size: 8, font: f, color });
      });
      y -= lineH;
    };

    drawRow(fields.map((f) => f.toUpperCase()), bold);
    rows.forEach((r) => drawRow(r, font));

    const bytes = await doc.save();
    return { ok: true, base64: Buffer.from(bytes).toString('base64') };
  } catch {
    return { ok: false, error: 'PDF export failed. Please try again.' };
  }
}

export async function importEntityCsv(
  entity: CsvEntity,
  text: string,
): Promise<{ ok: boolean; created: number; failed: number; error?: string }> {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (rows.length < 2) {
    return { ok: false, created: 0, failed: 0, error: 'CSV needs a header row and at least one data row.' };
  }
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const fields = FIELDS[entity];
  if (!header.includes('name')) {
    return { ok: false, created: 0, failed: 0, error: 'CSV must include a "name" column.' };
  }

  let created = 0;
  let failed = 0;
  for (const row of rows.slice(1)) {
    const payload: Record<string, string> = {};
    header.forEach((h, i) => {
      if (fields.includes(h)) {
        let val = (row[i] ?? '').trim();
        // Enum-ish fields are lowercase in the API — normalize so a CSV with
        // "Email" / "Company" still imports cleanly.
        if (h === 'source' || h === 'type') val = val.toLowerCase();
        if (val) payload[h] = val;
      }
    });
    if (!payload.name) {
      failed++;
      continue;
    }
    try {
      await apiServer(`/v1/${entity}`, { method: 'POST', body: JSON.stringify(payload) });
      created++;
    } catch {
      failed++;
    }
  }
  revalidatePath(`/${entity}`);
  return { ok: true, created, failed };
}
