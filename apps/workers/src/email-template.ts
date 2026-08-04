/**
 * Premium, email-client-safe HTML for transactional email (workers copy of
 * apps/api/src/common/email-template.ts — kept in sync; the two apps build
 * separately so a shared import isn't available without a new package).
 */
export interface BrandedEmailOptions {
  brandName: string;
  brandColor?: string | null;
  heading: string;
  intro?: string;
  rows?: { label: string; value: string }[];
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const HIDDEN_KEYS = new Set([
  'score', 'id', 'leadid', 'customerid', 'dealid', 'taskid', 'ticketid',
  'ownerid', 'assigneeid', 'organizationid', 'pipelineid', 'stageid',
]);
const KEY_LABELS: Record<string, string> = {
  name: 'Name', company: 'Company', email: 'Email', phone: 'Phone', source: 'Source',
  status: 'Status', title: 'Title', value: 'Value', stagename: 'Stage', createdat: 'Created',
};
const KEY_ORDER = ['name', 'title', 'company', 'email', 'phone', 'source', 'status', 'value', 'stagename', 'createdat'];

/** Turn an automation event context into human-friendly email rows (hides score + ids). */
export function automationEmailRows(context: Record<string, unknown>): { label: string; value: string }[] {
  const keys = Object.keys(context).filter((k) => {
    if (HIDDEN_KEYS.has(k.toLowerCase())) return false;
    const v = context[k];
    return v !== null && v !== undefined && String(v).trim() !== '' && typeof v !== 'object';
  });
  keys.sort((a, b) => {
    const ia = KEY_ORDER.indexOf(a.toLowerCase());
    const ib = KEY_ORDER.indexOf(b.toLowerCase());
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return keys.map((k) => {
    const lk = k.toLowerCase();
    let value = String(context[k]);
    if (lk === 'createdat' || lk === 'updatedat' || lk.includes('date')) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        value = `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
      }
    }
    const label = KEY_LABELS[lk] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
    return { label, value };
  });
}

export function renderBrandedEmail(o: BrandedEmailOptions): string {
  const color = o.brandColor && /^#[0-9a-fA-F]{6}$/.test(o.brandColor) ? o.brandColor : '#6366f1';
  const initial = (o.brandName.trim().charAt(0) || 'G').toUpperCase();
  const rowsHtml = (o.rows ?? [])
    .map(
      (r) => `<tr>
          <td style="padding:7px 0;color:#64748b;font-size:13px;white-space:nowrap;">${esc(r.label)}</td>
          <td style="padding:7px 0 7px 16px;color:#0f172a;font-size:13px;font-weight:600;">${esc(r.value)}</td>
        </tr>`,
    )
    .join('');
  const rowsCard = rowsHtml
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
         <tr><td style="padding:6px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table></td></tr>
       </table>`
    : '';
  const cta =
    o.ctaText && o.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td>
           <a href="${esc(o.ctaUrl)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">${esc(o.ctaText)}</a>
         </td></tr></table>`
      : '';

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
      <tr><td style="background:linear-gradient(135deg,${color},${color}bb);padding:22px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;"><div style="width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,0.22);color:#ffffff;font-weight:700;font-size:19px;text-align:center;line-height:38px;">${esc(initial)}</div></td>
          <td style="vertical-align:middle;padding-left:12px;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.01em;">${esc(o.brandName)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${esc(o.heading)}</h1>
        ${o.intro ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#475569;">${esc(o.intro)}</p>` : ''}
        ${rowsCard}
        ${cta}
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #eef2f6;color:#94a3b8;font-size:11px;line-height:1.5;">${esc(o.footerNote ?? `Sent automatically by ${o.brandName}.`)}</td></tr>
    </table>
    <p style="margin:16px 0 0;color:#cbd5e1;font-size:11px;">Powered by ${esc(o.brandName)}</p>
  </td></tr></table>
</body></html>`;
}
