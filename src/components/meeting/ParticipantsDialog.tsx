'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { uniqueNames } from '@/lib/meeting/participant-names';
import { useRecentParticipants } from '@/lib/meeting/use-recent-participants';
import { ParticipantsList } from './ParticipantsList';
import { cleanName, knownPeople } from './participantList';
import type { ParticipantsDialogProps } from './ParticipantsDialog.types';

export function ParticipantsDialog({
  ownerName,
  initial,
  onSkip,
  onStart,
}: ParticipantsDialogProps) {
  const t = useT('participants');
  const [names, setNames] = useState<string[]>(() =>
    initial.length > 0 ? initial : uniqueNames([ownerName]),
  );
  const recent = useRecentParticipants();
  const [created, setCreated] = useState<string[]>([]);
  const people = knownPeople([ownerName], recent, initial, created, names);
  const toggle = (name: string) =>
    setNames((cur) =>
      cur.some((n) => n.toLowerCase() === name.toLowerCase())
        ? cur.filter((n) => n.toLowerCase() !== name.toLowerCase())
        : [...cur, name],
    );
  const create = (raw: string) => {
    const name = cleanName(raw);
    if (!name) return;
    setCreated((cur) => [...cur, name]);
    setNames((cur) => uniqueNames([...cur, name]));
  };

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
      <ParticipantsList people={people} selected={names} onToggle={toggle} onCreate={create} />
    </Modal>
  );
}
