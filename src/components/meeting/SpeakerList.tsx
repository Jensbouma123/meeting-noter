'use client';

import { Users } from 'lucide-react';
import { EmptyState, Text } from '@jensbouma123/acciva-ui';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { useT } from '@/lib/i18n/useT';
import { isUnnamedSpeakerLabel } from '@/lib/meeting/participants';
import { getSpeakerColor } from './speaker-theme';
import { SpeakerAssign } from './SpeakerAssign';
import { SpeakerLabel } from './SpeakerLabel';
import { formatTalkTime } from './formatTalkTime';
import type { SpeakerListProps } from './RightRail.types';

export function SpeakerList({ rows, sessionId, onAssigned }: SpeakerListProps) {
  const tp = useT('participants');
  if (rows.length === 0) {
    return (
      <EmptyState
        size="sm"
        compact
        icon={<Users className="size-5" aria-hidden="true" />}
        title={tp('noSpeakers')}
        description={tp('noSpeakersHint')}
      />
    );
  }
  return (
    <ul
      aria-labelledby="rail-speakers-h"
      className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0"
    >
      {rows.map((spk) => {
        const colorStyle = getSpeakerColor(spk.colorIndex);
        const named = !isUnnamedSpeakerLabel(spk.label);
        const pct = spk.percentage;
        const assign = (
          <SpeakerAssign
            appearance="rail"
            sessionId={sessionId}
            speakerId={spk.id}
            label={spk.label}
            source={spk.source}
            otherLabels={rows.filter((r) => r.id !== spk.id).map((r) => r.label)}
            onAssigned={onAssigned}
          />
        );
        return (
          <li key={spk.id} className="animate-turn-enter flex flex-col gap-1.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`size-2 shrink-0 rounded-full ${colorStyle.dotClass}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                {named ? assign : <SpeakerLabel label={spk.label} />}
              </div>
              <Text size="xs" variant="muted" font="mono" className="shrink-0 tabular-nums">
                <span className="sr-only">{tp('talkTime')} </span>
                {formatTalkTime(spk.time)}
              </Text>
            </div>
            <div className="flex items-center gap-2 pl-4">
              <ProgressTrack
                value={Math.max(3, pct)}
                label={tp('talkShare').replace('{name}', spk.label).replace('{pct}', String(Math.round(pct)))}
                barClassName={colorStyle.barBgClass}
                className="flex-1"
              />
              <Text
                size="xs"
                variant="muted"
                font="mono"
                className="w-8 shrink-0 text-right tabular-nums"
                aria-hidden="true"
              >
                {Math.round(pct)}%
              </Text>
            </div>
            {!named && <div className="pl-4">{assign}</div>}
          </li>
        );
      })}
    </ul>
  );
}
