'use client';

import { Button, FormField, HStack, Input, Modal, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { FixWordDialogProps } from './FixWordAction.types';

export function FixWordDialog({ heard, draft, onDraftChange, onClose, onSave }: FixWordDialogProps) {
  const t = useT('transcript');
  return (
    <Modal
      open={heard !== null}
      onClose={onClose}
      title={t('fixWord.title')}
      description={t('fixWord.description')}
      size="sm"
      footer={
        <HStack spacing="sm">
          <Button variant="outline" onClick={onClose}>
            {t('fixWord.cancel')}
          </Button>
          <Button variant="primary" onClick={onSave} disabled={draft.trim().length === 0}>
            {t('fixWord.save')}
          </Button>
        </HStack>
      }
    >
      <VStack spacing="md" fill>
        <Text size="sm" variant="muted">
          {t('fixWord.says').replace('{heard}', heard ?? '')}
        </Text>
        <FormField id="fix-word-spelling" label={t('fixWord.label')}>
          <Input
            id="fix-word-spelling"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSave();
              }
            }}
            placeholder={t('fixWord.placeholder')}
            autoComplete="off"
            autoFocus
          />
        </FormField>
      </VStack>
    </Modal>
  );
}
