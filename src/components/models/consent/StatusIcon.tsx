import { CheckCircle2, Info, Loader2, TriangleAlert, XCircle } from 'lucide-react';
import type { ModelStatus } from '@/lib/asr/browser';

export function StatusIcon({ status }: { status: ModelStatus }) {
  const cls = 'size-4 shrink-0';
  switch (status) {
    case 'cached':
      return <CheckCircle2 className={`${cls} text-success`} />;
    case 'failed':
      return <XCircle className={`${cls} text-danger`} />;
    case 'cancelled':
      return <TriangleAlert className={`${cls} text-warning`} />;
    case 'downloading':
      return <Loader2 className={`${cls} text-primary-500 motion-safe:animate-spin`} />;
    default:
      return <Info className={`${cls} text-muted-foreground`} />;
  }
}
