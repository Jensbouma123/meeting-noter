'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { AssistantCopyIconProps } from './Assistant.types';

export function AssistantCopyIcon({ text }: AssistantCopyIconProps) {
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
    <Button
      variant="outline"
      size="sm"
      iconOnly
      tooltip={t('copy')}
      aria-label={t('copy')}
      onClick={() => void copy()}
      leadingIcon={copied ? <Check data-testid="copied-icon" /> : <Copy data-testid="copy-icon" />}
    />
  );
}
