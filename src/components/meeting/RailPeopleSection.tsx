'use client';

import { Info } from 'lucide-react';
import { Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { isUnnamedSpeakerLabel, unassignedParticipants } from '@/lib/meeting/participant-names';
import { setParticipants, useParticipants } from '@/lib/meeting/participants';
import { useRecentParticipants } from '@/lib/meeting/use-recent-participants';
import { ParticipantsEditor } from './ParticipantsEditor';
import { SpeakerList } from './SpeakerList';
import type { RailPeopleSectionProps } from './RightRail.types';

export function RailPeopleSection({ sessionId, rows, onAssigned }: RailPeopleSectionProps) {
  const tp = useT('participants');
  const participants = useParticipants(sessionId);
  const recentParticipants = useRecentParticipants();
  const unmatched = unassignedParticipants(participants, rows.map((r) => r.label));
  const hasUnnamed = rows.some((r) => isUnnamedSpeakerLabel(r.label));
  const [unmatchedBefore, unmatchedAfter] = (hasUnnamed ? tp('unassigned') : tp('notHeard')).split('{names}');

  return (
    <>
      <section
        aria-labelledby="rail-people-h"
        data-testid="participants-editor"
        className="flex w-full flex-col gap-2"
      >
        <h3 id="rail-people-h" className="m-0">
          <Text size="xs" weight="semibold" variant="muted">
            {tp('heading')}
          </Text>
        </h3>
        {participants.length === 0 && (
          <Text size="xs" variant="muted">
            {tp('railHint')}
          </Text>
        )}
        <ParticipantsEditor
          id="rail-participants-add"
          compact
          names={participants}
          suggestions={recentParticipants}
          onChange={(names) => setParticipants(sessionId, names)}
        />
      </section>
      <section
        aria-labelledby="rail-speakers-h"
        className="flex w-full flex-col gap-2 border-t border-border-subtle pt-3"
      >
        <h3 id="rail-speakers-h" className="m-0">
          <Text size="xs" weight="semibold" variant="muted">
            {tp('speakers')}
          </Text>
        </h3>
        {rows.length > 0 && unmatched.length > 0 && (
          <div
            role="status"
            data-testid="participants-unassigned"
            className="flex items-start gap-2 rounded-md border border-border-subtle bg-elevation-2 px-2.5 py-2 text-xs text-foreground"
          >
            <Info className="mt-px size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              {unmatchedBefore}
              <strong className="font-semibold">{unmatched.join(', ')}</strong>
              {unmatchedAfter}
            </span>
          </div>
        )}
        <SpeakerList rows={rows} sessionId={sessionId} onAssigned={onAssigned} />
      </section>
    </>
  );
}
