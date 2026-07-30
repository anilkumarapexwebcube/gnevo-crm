'use client';

import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function InvoiceToolbar() {
  function share() {
    const url = window.location.href.split('?')[0] ?? window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success('Invoice link copied to clipboard'))
      .catch(() => toast.error('Could not copy link'));
  }

  return (
    <div className="no-print flex gap-2">
      <Button variant="outline" size="sm" onClick={share}>
        <Share2 />
        Share
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Download />
        Download / Print
      </Button>
    </div>
  );
}
