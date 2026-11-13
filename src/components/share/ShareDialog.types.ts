import type { Segment, Speaker } from '@/lib/meeting/types';

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
}
