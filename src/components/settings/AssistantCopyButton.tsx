'use client';

import { useState } from 'react';
import { Button } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { AssistantCopyButtonProps } from './Assistant.types';

export function AssistantCopyButton({ text, label }: AssistantCopyButtonProps) {
  const t = useT('assistant');
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Button variant="secondary" size="sm" onClick={() => void copy()}>
      {copied ? t('copied') : label}
    </Button>
  );
}
