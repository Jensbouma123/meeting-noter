'use client';

import { Button, Modal } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { MarkdownNotes } from './MarkdownNotes';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  notes: string | null;
  pageUrl?: string | null;
}

export function ReleaseNotesDialog({ open, onClose, title, notes, pageUrl }: Props) {
  const t = useT('update');
  const link = pageUrl && /^https?:\/\//.test(pageUrl) ? pageUrl : null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          {link && <Button variant="ghost" onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}>{t('viewOnGithub')}</Button>}
          <Button onClick={onClose}>{t('close')}</Button>
        </>
      }
    >
      <div tabIndex={0} role="region" aria-label={title} className="max-h-[60vh] overflow-y-auto">
        {notes ? <MarkdownNotes source={notes} /> : <p className="text-sm">{t('noNotes')}</p>}
      </div>
    </Modal>
  );
}
