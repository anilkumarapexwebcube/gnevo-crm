'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  exportEntityCsv,
  exportEntityExcel,
  exportEntityPdf,
  importEntityCsv,
  type CsvEntity,
} from '@/lib/csv-actions';

function download(name: string, mime: string, data: Blob | string) {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export function ImportExportButtons({ entity }: { entity: CsvEntity }) {
  const router = useRouter();
  const [exporting, startExport] = useTransition();
  const [importing, startImport] = useTransition();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileText = useRef<string>('');
  const label = entity === 'leads' ? 'leads' : 'customers';

  function doExport(format: 'csv' | 'excel' | 'pdf') {
    startExport(async () => {
      try {
        if (format === 'csv') {
          const res = await exportEntityCsv(entity);
          if (!res.ok || res.csv === undefined) throw new Error(res.error);
          download(`${entity}-export.csv`, 'text/csv;charset=utf-8;', res.csv);
        } else if (format === 'excel') {
          const res = await exportEntityExcel(entity);
          if (!res.ok || !res.base64) throw new Error(res.error);
          download(
            `${entity}-export.xlsx`,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            base64ToBlob(
              res.base64,
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ),
          );
        } else {
          const res = await exportEntityPdf(entity);
          if (!res.ok || !res.base64) throw new Error(res.error);
          download(`${entity}-export.pdf`, 'application/pdf', base64ToBlob(res.base64, 'application/pdf'));
        }
        toast.success('Export ready');
      } catch (e) {
        toast.error((e as Error).message || 'Export failed');
      }
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    fileText.current = await file.text();
  }

  function doImport() {
    if (!fileText.current) {
      toast.error('Choose a CSV file first');
      return;
    }
    startImport(async () => {
      const res = await importEntityCsv(entity, fileText.current);
      if (res.ok) {
        toast.success(`Imported ${res.created} ${label}${res.failed ? `, ${res.failed} skipped` : ''}`);
        setOpen(false);
        setFileName('');
        fileText.current = '';
        router.refresh();
      } else {
        toast.error(res.error ?? 'Import failed');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" loading={exporting}>
              {!exporting && <Download className="size-4" />}
              Export
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => doExport('csv')}>
            <FileText className="size-4" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => doExport('excel')}>
            <FileSpreadsheet className="size-4" />
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => doExport('pdf')}>
            <FileType className="size-4" />
            PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Upload className="size-4" />
          Import
        </Button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import {label} from CSV</DialogTitle>
            <DialogDescription>
              First row must be column headers. Supported columns:{' '}
              <span className="font-medium">
                {entity === 'leads'
                  ? 'name, email, phone, company, source'
                  : 'name, type, industry, website'}
              </span>
              . A <span className="font-medium">name</span> is required per row.
            </DialogDescription>
          </DialogHeader>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-8 text-center transition-colors hover:bg-muted/50">
            <Upload className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">
              {fileName || 'Click to choose a .csv file'}
            </span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={doImport} loading={importing} disabled={!fileName}>
              {importing ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
