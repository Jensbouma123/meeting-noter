'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  FormField,
  HStack,
  Input,
  Modal,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';
import { useLanguage, useT } from '@/lib/i18n/useT';
import type { Language } from '@/lib/i18n/types';

const MAX_NAME_LENGTH = 80;

interface NewSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (sessionId: string, title: string) => void;
}

export function NewSessionDialog({ open, onClose, onCreate }: NewSessionDialogProps) {
  const t = useT('sidebar');
  const language = useLanguage();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the draft whenever the dialog opens, and put focus on the name field
  // (effects run after Modal's own open pass, so this wins over its default of
  // the first button, Annuleren) so Enter starts the meeting right away.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset state on open */
    if (open) {
      setDraft('');
      setError(null);
      nameRef.current?.focus();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const handleSubmit = useCallback(() => {
    const trimmed = draft.trim() || defaultMeetingName(language);
    setIsSubmitting(true);
    try {
      onCreate('', trimmed);
    } catch {
      setError(t('createError'));
    }
    setIsSubmitting(false);
  }, [draft, language, onCreate, t]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('newTitle')}
      description={t('newDescription')}
      footer={
        <HStack spacing="sm">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            {t('create')}
          </Button>
        </HStack>
      }
    >
      <VStack spacing="md" fill>
        <FormField
          id="session-name"
          label={t('nameOptional')}
          hint={t('nameHint')}
          error={error ?? undefined}
        >
          <Input
            ref={nameRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            id="session-name"
            placeholder={t('namePlaceholder')}
            maxLength={MAX_NAME_LENGTH}
            showCharCount
            clearable={draft.length > 0}
            onClear={() => {
              setDraft('');
              setError(null);
            }}
            autoComplete="off"
          />
        </FormField>

        <Text size="xs" variant="subtle">
          {t('recordingHint')}
        </Text>
      </VStack>
    </Modal>
  );
}

function defaultMeetingName(language: Language): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now);
  const time = new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return `Meeting ${date}, ${time}`;
}
