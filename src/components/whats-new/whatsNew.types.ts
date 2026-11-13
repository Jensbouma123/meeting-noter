export interface WhatsNewData {
  version: string;
  notes: string;
  pageUrl: string | null;
}

export type PreviewKind = 'update' | 'whats-new';

export interface ReleaseNotesDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  notes: string | null;
  pageUrl?: string | null;
}
