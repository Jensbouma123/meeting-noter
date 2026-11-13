import { CheckCircle2, Cpu, Loader2 } from 'lucide-react';
import type { StatusIconProps } from './types';

export function StatusIcon({ status, preparing }: StatusIconProps) {
  const cls = 'size-4 shrink-0';
  if (preparing) {
    return <Loader2 className={`${cls} text-primary-500 motion-safe:animate-spin`} aria-hidden="true" />;
  }
  switch (status) {
    case 'cached':
      return <CheckCircle2 className={`${cls} text-success`} aria-hidden="true" />;
    case 'downloading':
      return <Loader2 className={`${cls} text-primary-500 motion-safe:animate-spin`} aria-hidden="true" />;
    case 'failed':
      return null;
    default:
      return <Cpu className={`${cls} text-muted-foreground`} aria-hidden="true" />;
  }
}
