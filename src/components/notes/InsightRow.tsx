import { Badge, Button, Text } from '@jensbouma123/acciva-ui';
import { ArrowUpRight, Check, X } from 'lucide-react';
import { formatClock } from '@/lib/meeting/transcript-format';
import type { InsightRowProps } from './InsightSuggestions.types';

export function InsightRow({ insight, speakerLabel, t, onJump, onAccept, onDismiss }: InsightRowProps) {
  return <li data-suggestion className="flex min-w-0 flex-col gap-1 rounded-md border border-dashed border-border-soft bg-muted/40 p-2">
    <div className="flex min-w-0 items-start gap-2">
      <Badge variant="neutral" size="sm" className="shrink-0">{t('suggestionBadge')}</Badge>
      <Text size="sm" className="min-w-0 break-words italic text-muted-foreground">&ldquo;{insight.text}&rdquo;</Text>
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <Text size="xs" className="min-w-0 flex-1 truncate text-muted-foreground">
        {formatClock(insight.start)} · {speakerLabel}
      </Text>
      <Button size="sm" variant="ghost" aria-label={`${t('jump')}: ${insight.text}`}
        leadingIcon={<ArrowUpRight aria-hidden="true" className="size-4" />} onClick={onJump}>{t('jump')}</Button>
      <Button size="sm" variant="secondary" aria-label={`${t('accept')}: ${insight.text}`}
        leadingIcon={<Check aria-hidden="true" className="size-4" />} onClick={onAccept}>{t('accept')}</Button>
      <Button size="sm" variant="ghost" aria-label={`${t('dismiss')}: ${insight.text}`}
        leadingIcon={<X aria-hidden="true" className="size-4" />} onClick={onDismiss}>{t('dismiss')}</Button>
    </div>
  </li>;
}
