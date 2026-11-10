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

const MAX_NAME_LENGTH = 80;

interface NewSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (sessionId: string, title: string) => void;
}

export function NewSessionDialog({ open, onClose, onCreate }: NewSessionDialogProps) {
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
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Enter a name for the meeting.');
      return;
    }
    setIsSubmitting(true);
    try {
      onCreate('', trimmed);
    } catch {
      setError("Couldn't create the meeting. Try again.");
    }
    setIsSubmitting(false);
  }, [draft, onCreate]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New meeting"
      description="Give it a name so you can find it later."
      footer={
        <HStack spacing="sm">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={draft.trim().length === 0}
            leadingIcon={<Plus className="size-4" />}
          >
            Create meeting
          </Button>
        </HStack>
      }
    >
      <VStack spacing="md" fill>
        <FormField
          id="session-name"
          label="Meeting name"
          hint="You can rename it any time."
          error={error ?? undefined}
          required
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
            placeholder="e.g. Sprint planning #42"
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
          Recording doesn&apos;t start until you press Record.
        </Text>
      </VStack>
    </Modal>
  );
}
