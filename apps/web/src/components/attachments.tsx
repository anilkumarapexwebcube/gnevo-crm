'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Download,
  Eye,
  FileText,
  History,
  Paperclip,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import DOMPurify from 'isomorphic-dompurify';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploaderName: string | null;
  version: number;
  versionCount?: number;
  createdAt: string;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'zip'];
const ACCEPT = ALLOWED_EXT.map((e) => `.${e}`).join(',');

const isImage = (m: string) => m.startsWith('image/');
const isPdf = (m: string) => m === 'application/pdf';
const isDocx = (name: string) => name.toLowerCase().endsWith('.docx');
const isPreviewable = (m: string, name: string) => isImage(m) || isPdf(m) || isDocx(name);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function validate(file: File): string | null {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (!ALLOWED_EXT.includes(ext)) return 'File type not allowed. Use PDF, Word, Excel, PowerPoint, CSV, TXT, images or ZIP.';
  if (file.size > MAX_BYTES) return 'File exceeds the 8 MB limit';
  return null;
}

export function Attachments({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<FileMeta | null>(null);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<FileMeta[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const versionTargetId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/files?entityType=${entityType}&entityId=${entityId}`);
      const data = res.ok ? ((await res.json()) as FileMeta[]) : [];
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      setFiles([]);
    } finally {
      setInitializing(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch rendered HTML when previewing a .docx.
  useEffect(() => {
    if (preview && isDocx(preview.name)) {
      setDocLoading(true);
      setDocHtml(null);
      fetch(`/api/files/${preview.id}/preview-html`)
        .then(async (r) => {
          const d = (r.ok ? await r.json() : { html: '' }) as { html?: string };
          setDocHtml(d.html || '<p>(empty document)</p>');
        })
        .catch(() => setDocHtml('<p>Could not render this document.</p>'))
        .finally(() => setDocLoading(false));
    } else {
      setDocHtml(null);
    }
  }, [preview]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    const err = validate(file);
    if (err) return toast.error(err);
    setUploading(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type, dataBase64, entityType, entityId }),
      });
      if (res.ok) {
        toast.success('File uploaded');
        await load();
      } else {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; message?: string };
        toast.error(body.detail ?? body.message ?? 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function pickNewVersion(id: string) {
    versionTargetId.current = id;
    versionInputRef.current?.click();
  }

  async function onNewVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = versionTargetId.current;
    if (versionInputRef.current) versionInputRef.current.value = '';
    if (!file || !id) return;
    const err = validate(file);
    if (err) return toast.error(err);
    setBusyId(id);
    try {
      const dataBase64 = await fileToBase64(file);
      const res = await fetch(`/api/files/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type, dataBase64 }),
      });
      if (res.ok) {
        toast.success('New version uploaded');
        await load();
        if (historyId === id) {
          const r = await fetch(`/api/files/${id}/versions`);
          setHistory(r.ok ? ((await r.json()) as FileMeta[]) : []);
        }
      } else {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; message?: string };
        toast.error(body.detail ?? body.message ?? 'Upload failed');
      }
    } finally {
      setBusyId(null);
    }
  }

  async function openHistory(id: string) {
    if (historyId === id) {
      setHistoryId(null);
      return;
    }
    setHistoryId(id);
    try {
      const res = await fetch(`/api/files/${id}/versions`);
      setHistory(res.ok ? ((await res.json()) as FileMeta[]) : []);
    } catch {
      setHistory([]);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        toast.success('File removed');
      } else {
        toast.error('Could not remove file');
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Paperclip className="size-4 text-muted-foreground" />
          Attachments
          {files.length > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {files.length}
            </span>
          )}
        </h2>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
          {!uploading && <Upload className="size-4" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onFile} />
        <input ref={versionInputRef} type="file" accept={ACCEPT} className="hidden" onChange={onNewVersion} />
      </div>

      {initializing ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 py-8 text-center">
          <Paperclip className="size-5 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No files yet.</p>
          <p className="text-xs text-muted-foreground/70">
            PDF, Word, Excel, PowerPoint, CSV, images or ZIP · up to 8 MB each
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50">
          {files.map((f) => (
            <li key={f.id} className="flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/30">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{f.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {humanSize(f.size)}
                    {f.uploaderName ? ` · ${f.uploaderName}` : ''}
                    {(f.versionCount ?? 1) > 1 && (
                      <button
                        onClick={() => openHistory(f.id)}
                        className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0 font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        <History className="size-3" />v{f.version} · {f.versionCount} versions
                      </button>
                    )}
                  </span>
                </div>
                {isPreviewable(f.mimeType, f.name) && (
                  <Button variant="ghost" size="icon-sm" onClick={() => setPreview(f)} aria-label={`Preview ${f.name}`} title="Preview">
                    <Eye className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => pickNewVersion(f.id)}
                  loading={busyId === f.id}
                  aria-label={`Upload new version of ${f.name}`}
                  title="Upload new version"
                >
                  {busyId !== f.id && <UploadCloud className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={<a href={`/api/files/${f.id}/download`} />}
                  nativeButton={false}
                  aria-label={`Download ${f.name}`}
                  title="Download"
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-danger"
                  onClick={() => remove(f.id)}
                  aria-label={`Delete ${f.name}`}
                  title="Delete"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <AnimatePresence>
                {historyId === f.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-secondary/20"
                  >
                    <ul className="flex flex-col divide-y divide-border/30 px-4 py-2">
                      {history.map((v) => (
                        <li key={v.id} className="flex items-center gap-2 py-1.5 text-xs">
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {v.version}
                          </span>
                          <span className="text-muted-foreground">
                            {humanSize(v.size)}
                            {v.uploaderName ? ` · ${v.uploaderName}` : ''} ·{' '}
                            {new Date(v.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <a
                            href={`/api/files/${v.id}/download`}
                            className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Download className="size-3" />
                            Download
                          </a>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="w-[95vw] max-w-6xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{preview?.name}</span>
              </DialogTitle>
              {preview && (
                <Button variant="outline" size="xs" render={<a href={`/api/files/${preview.id}/download`} />} nativeButton={false}>
                  <Download className="size-3" />
                  Download
                </Button>
              )}
            </div>
          </DialogHeader>
          {preview && (
            <div className="flex min-h-[60vh] items-center justify-center overflow-auto rounded-lg bg-secondary/20 p-2">
              {isImage(preview.mimeType) ? (
                <img src={`/api/files/${preview.id}/download?inline=1`} alt={preview.name} className="max-h-[80vh] w-auto rounded-md object-contain" />
              ) : isPdf(preview.mimeType) ? (
                <iframe src={`/api/files/${preview.id}/download?inline=1`} title={preview.name} className="h-[80vh] w-full rounded-md border-0" />
              ) : isDocx(preview.name) ? (
                docLoading ? (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="max-h-[80vh] w-full overflow-auto rounded-md bg-card p-8 shadow-inner">
                    <article
                      className="article-content mx-auto max-w-3xl text-sm leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(docHtml ?? '') }}
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <X className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No inline preview for this file type.</p>
                  <Button size="sm" render={<a href={`/api/files/${preview.id}/download`} />} nativeButton={false}>
                    <Download className="size-4" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
