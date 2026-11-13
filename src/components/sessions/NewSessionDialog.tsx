'use client';

import { useState, useCallback, useRef } from 'react';
import { useOnChange } from '@/hooks/useOnChange';
import {
  Button,
  FormField,
  HStack,
  Input,
  Modal,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useT } from '@/lib/i18n/useT';
import { defaultMeetingName } from './defaultMeetingName';
import type { NewSessionDialogProps } from './NewSessionDialog.types';

const MAX_NAME_LENGTH = 80;

export function NewSessionDialog({ open, onClose, onCreate }: NewSessionDialogProps) {
  const t = useT('sidebar');
  const language = useLanguage();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft('');
      setError(null);
    }
  }

  useOnChange(open, (isOpen) => {
    if (isOpen) nameRef.current?.focus();
  });

  const submitSessionName = useCallback(() => {
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
            onClick={submitSessionName}
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
                submitSessionName();
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
