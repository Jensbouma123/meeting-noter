'use client';

import { AssistantCard } from './AssistantCard';
import { SettingsGroup } from './SettingsGroup';
import type { AssistantListProps } from './Assistant.types';

export function AssistantList({ assistants, state }: AssistantListProps) {
  return (
    <SettingsGroup>
      {assistants.map((a) => (
        <div key={a.id} className={a.status === 'not-found' ? 'opacity-60' : undefined}>
          <AssistantCard
            assistant={a}
            busy={state.busyId === a.id}
            error={state.errors[a.id] ?? null}
            confirm={state.confirmFor[a.id] ?? null}
            restartNotice={!!state.restart[a.id]}
            onConnect={(confirmed) => void state.connect(a.id, confirmed)}
            onDisconnect={() => void state.disconnect(a.id)}
            onCancelConfirm={() => state.cancelConfirm(a.id)}
          />
        </div>
      ))}
    </SettingsGroup>
  );
}
