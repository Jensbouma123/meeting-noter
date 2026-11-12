'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { uniqueNames, useRecentParticipants } from '@/lib/meeting/participants';
import { ParticipantsEditor } from './ParticipantsEditor';

/**
 * "Who is in this meeting?" — shown before a new recording starts. Never in
 * the way: Skip, Enter in the empty field, or R starts straight away.
 */
export function ParticipantsDialog({
  ownerName,
  initial,
  onSkip,
  onStart,
}: {
  ownerName: string;
  /** Names already on the meeting; the owner is added when there are none. */
  initial: string[];
  onSkip: () => void;
  onStart: (names: string[]) => void;
}) {
  const t = useT('participants');
  const [names, setNames] = useState<string[]>(() =>
    initial.length > 0 ? initial : uniqueNames([ownerName]),
  );
  const recent = useRecentParticipants();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      onStart(names);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [names, onStart]);

  return (
    <Modal
      open
      onClose={onSkip}
      title={t('title')}
      description={t('description')}
      size="md"
      footer={
        <div className="dialog-actions flex w-full flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <Button variant="primary" className="min-h-11 w-full sm:w-auto" onClick={() => onStart(names)}>
            {t('start')}
          </Button>
          <Button variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onSkip}>
            {t('skip')}
          </Button>
        </div>
      }
    >
      <ParticipantsEditor
        id="participants-add"
        names={names}
        suggestions={recent}
        onChange={setNames}
        onEmptyEnter={() => onStart(names)}
      />
    </Modal>
  );
}
