'use client';

import { useId, useState } from 'react';
import { Button, Modal } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { CustomQuestionDialogProps } from './CustomQuestionDialog.types';

export function CustomQuestionDialog({ open, assistantName, onClose, onSubmit }: CustomQuestionDialogProps) {
  const t = useT('ask');
  const fieldId = useId();
  const [question, setQuestion] = useState('');
  const fill = (message: string) => message.replace('{name}', assistantName);

  const cancel = () => {
    setQuestion('');
    onClose();
  };
  const submit = () => {
    const text = question.trim();
    if (!text) return;
    setQuestion('');
    onSubmit(text);
  };

  return (
    <Modal
      open={open}
      onClose={cancel}
      size="md"
      title={fill(t('customTitle'))}
      footer={
        <>
          <Button variant="outline" onClick={cancel}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} disabled={!question.trim()}>
            {fill(t('send'))}
          </Button>
        </>
      }
    >
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium">
        {t('customLabel')}
      </label>
      <textarea
        id={fieldId}
        value={question}
        rows={4}
        placeholder={t('customPlaceholder')}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit();
        }}
        className="focus-ring w-full resize-y rounded-md border border-border bg-surface p-2 text-sm"
      />
    </Modal>
  );
}
