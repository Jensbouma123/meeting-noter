import { Button, Text } from '@jensbouma123/acciva-ui';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { formatClock } from '@/lib/meeting/transcript-format';
import type { InsightRowProps } from './InsightSuggestions.types';

export function InsightRow({ insight, speakerLabel, t, onJump, onAdd, onDismiss }: InsightRowProps) {
  return <li className="flex min-w-0 flex-col gap-1 rounded-md border border-border-soft p-2">
    <Text size="sm" className="min-w-0 break-words">&ldquo;{insight.text}&rdquo;</Text>
    <div className="flex min-w-0 items-center gap-1">
      <Text size="xs" className="min-w-0 flex-1 truncate text-muted-foreground">
        {formatClock(insight.start)} · {speakerLabel}
      </Text>
      <Button size="sm" variant="ghost" aria-label={`${t('jump')}: ${insight.text}`}
        leadingIcon={<ArrowUpRight aria-hidden="true" className="size-4" />} onClick={onJump}>{t('jump')}</Button>
      <Button size="sm" variant="ghost" aria-label={`${t('add')}: ${insight.text}`}
        leadingIcon={<Plus aria-hidden="true" className="size-4" />} onClick={onAdd}>{t('add')}</Button>
      <Button iconOnly size="sm" variant="ghost" tooltip={t('dismiss')} aria-label={`${t('dismiss')}: ${insight.text}`}
        leadingIcon={<X aria-hidden="true" className="size-4" />} onClick={onDismiss} />
    </div>
  </li>;
}
