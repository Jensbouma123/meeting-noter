import { Text } from '@jensbouma123/acciva-ui';
import { addAction, addDecision } from '@/lib/meeting/notes';
import { requestSeek } from '@/lib/meeting/seek-event';
import type { Insight } from '@/lib/semantic-search/insights/types/insight';
import { InsightRow } from './InsightRow';
import type { InsightSuggestionsProps } from './InsightSuggestions.types';
import { useInsights } from './useInsights';

export function InsightSuggestions({ sessionId, speakers, t }: InsightSuggestionsProps) {
  const { visible, dismiss } = useInsights(sessionId);
  if (visible.length === 0) return null;
  const labelFor = (id: string) => speakers.find((s) => s.id === id)?.label ?? id;
  const promote = (i: Insight) => i.kind === 'action'
    ? addAction(sessionId, i.text, { sourceSegmentId: i.segmentId })
    : addDecision(sessionId, i.text, i.segmentId);
  const groups = [['decision', t('suggestedDecisions')], ['action', t('suggestedActions')]] as const;
  return <>
    {groups.map(([kind, title]) => {
      const items = visible.filter((i) => i.kind === kind);
      return items.length === 0 ? null : <section key={kind} aria-label={title} className="w-full min-w-0">
        <Text size="sm" className="font-medium text-muted-foreground">{title} ({items.length})</Text>
        <ul className="mt-1 flex w-full min-w-0 flex-col gap-2">
          {items.map((i) => <InsightRow key={i.id} insight={i} speakerLabel={labelFor(i.speakerId)} t={t}
            onJump={() => requestSeek(i.start)} onAdd={() => promote(i)} onDismiss={() => dismiss(i.id)} />)}
        </ul>
      </section>;
    })}
  </>;
}
