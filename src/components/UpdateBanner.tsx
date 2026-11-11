'use client';

import { Alert, Button } from '@jensbouma123/acciva-ui';
import { useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import { useUpdate } from './update/useUpdate';
import { UpdateDialog } from './update/UpdateDialog';

export function UpdateBanner({ isRecording = false }: { isRecording?: boolean }) {
  const t = useT('update');
  const update = useUpdate(isRecording);
  const [open, setOpen] = useState(false);
  const info = update.info;
  if (!info?.available || !info.latest || update.dismissedVersion === info.latest) return null;

  return (
    <>
      <Alert layout="banner" variant="info" role="status" dismissible onDismiss={() => update.dismiss(info.latest!)}>
        {t('banner').replace('{version}', info.latest)}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.open(info.pageUrl, '_blank', 'noopener,noreferrer')}>
            {t('whatsNew')}
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>{t('updateNow')}</Button>
          <Button variant="ghost" size="sm" onClick={() => update.dismiss(info.latest!)}>{t('later')}</Button>
        </div>
      </Alert>
      <UpdateDialog open={open} onClose={() => setOpen(false)} isRecording={isRecording} />
    </>
  );
}
