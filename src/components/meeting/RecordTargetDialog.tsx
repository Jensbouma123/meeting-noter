'use client';

import { Button, Modal } from '@jensbouma123/acciva-ui';

export interface RecordTargetDialogProps {
  open: boolean;
  title: string;
  segmentCount: number;
  durationSeconds: number;
  /** Escape, backdrop click and the Cancel button. Changes nothing. */
  onCancel: () => void;
  onAppend: () => void;
  onStartNew: () => void;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Shown when Record is pressed in a session that already has a transcript:
 * append the new recording to it, or leave it alone and start a new session.
 */
export function RecordTargetDialog({
  open,
  title,
  segmentCount,
  durationSeconds,
  onCancel,
  onAppend,
  onStartNew,
}: RecordTargetDialogProps) {
  const noun = segmentCount === 1 ? 'segment' : 'segments';
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="This session already has a transcript"
      description={`“${title}” has ${segmentCount} ${noun} (${formatDuration(durationSeconds)}). Add the new recording to it, or keep it as is and start a new session?`}
      size="sm"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <Button variant="primary" className="min-h-11 w-full sm:w-auto" onClick={onAppend}>
            Append to this session
          </Button>
          <Button variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={onStartNew}>
            Start a new session
          </Button>
          <Button variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      }
    />
  );
}
