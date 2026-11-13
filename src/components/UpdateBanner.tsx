'use client';

import { Alert, Button, useToast } from '@jensbouma123/acciva-ui';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import { UpdateDialog } from './update/UpdateDialog';
import { ReleaseNotesDialog } from './whats-new/ReleaseNotesDialog';
import { useBannerState } from './UpdateBanner.state';

export function UpdateBanner({ isRecording = false }: { isRecording?: boolean }) {
  const t = useT('update');
  const { toast } = useToast();
  const { info, preview, dismiss } = useBannerState(isRecording);
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  if (!info?.latest) return null;
  const latest = info.latest;
  const updateNow = () => (preview ? toast({ title: t('previewNoUpdate'), variant: 'info' }) : setOpen(true));

  return (
    <>
      <Alert layout="banner" variant="info" role="status" dismissible onDismiss={() => dismiss(latest)}>
        <span className="flex flex-wrap items-center gap-2">
          <span>{t('banner').replace('{version}', latest)}</span>
          <Button size="sm" onClick={updateNow}>{t('updateNow')}</Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            tooltip={t('releaseNotes')}
            leadingIcon={<Info className="size-4" />}
            aria-haspopup="dialog"
            onClick={() => setNotesOpen(true)}
          />
        </span>
      </Alert>
      <ReleaseNotesDialog
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title={t('releaseNotesTitle').replace('{version}', latest)}
        notes={info.notes}
        pageUrl={info.pageUrl}
      />
      {!preview && <UpdateDialog open={open} onClose={() => setOpen(false)} isRecording={isRecording} />}
    </>
  );
}
