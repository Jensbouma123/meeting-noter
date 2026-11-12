'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  FormField,
  HStack,
  Input,
  Modal,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';
import { Plus } from 'lucide-react';
import { useLanguage, useT } from '@/lib/i18n/useT';
import type { Language } from '@/lib/i18n/LanguageContext';

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

  // Reset the draft whenever the dialog opens. `Modal` moves focus to the first
  // focusable element, so `Input` needs no manual focus dance.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset state on open */
    if (open) {
      setDraft('');
      setError(null);
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
            leadingIcon={<Plus className="size-4" />}
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
            autoFocus
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
