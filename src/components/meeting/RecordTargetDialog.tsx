'use client';

import { Button, Modal } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { RecordTargetDialogProps } from './RecordTargetDialog.types';

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function RecordTargetDialog({
  open,
  title,
  durationSeconds,
  onCancel,
  onAppend,
  onStartNew,
}: RecordTargetDialogProps) {
  const t = useT('dialogs');
  const description = t('recordTarget.description')
    .replace('{title}', title)
    .replace('{duration}', formatDuration(durationSeconds));
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('recordTarget.title')}
      description={description}
      size="md"
      footer={
        <div className="dialog-actions flex w-full flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <Button variant="primary" className="min-h-11 w-full sm:w-auto" onClick={onAppend}>
            {t('recordTarget.append')}
          </Button>
          <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={onStartNew}>
            {t('recordTarget.newSession')}
          </Button>
          <Button variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onCancel}>
            {t('recordTarget.cancel')}
          </Button>
        </div>
      }
    />
  );
}
