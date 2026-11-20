import { isAssistantId } from '@/lib/assistants/ids';
import type { AssistantInfo } from '@/lib/assistants/types';
import type { AskAssistantId, ConfiguredAssistants } from './types';

const NOT_LOADED: ConfiguredAssistants = { loaded: false, ids: [] };

const listeners = new Set<() => void>();
let snapshot = NOT_LOADED;
let inflight: Promise<void> | null = null;

function publish(next: ConfiguredAssistants) {
  snapshot = next;
  listeners.forEach((notify) => notify());
}

async function fetchConnectedIds(): Promise<AskAssistantId[]> {
  const res = await fetch('/api/assistants');
  if (!res.ok) throw new Error('load');
  const body = (await res.json()) as { assistants: AssistantInfo[] };
  return body.assistants
    .filter((a) => (a.status === 'connected' || a.status === 'installed') && isAssistantId(a.id))
    .map((a) => a.id);
}

export function loadConfiguredAssistants(): Promise<void> {
  inflight ??= fetchConnectedIds()
    .then(
      (ids) => publish({ loaded: true, ids }),
      () => publish({ loaded: true, ids: snapshot.ids }),
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function subscribeConfiguredAssistants(onChange: () => void) {
  listeners.add(onChange);
  if (!snapshot.loaded) void loadConfiguredAssistants();
  return () => {
    listeners.delete(onChange);
  };
}

export function getConfiguredAssistants(): ConfiguredAssistants {
  return snapshot;
}

export function getServerConfiguredAssistants(): ConfiguredAssistants {
  return NOT_LOADED;
}

export function resetConfiguredAssistants() {
  snapshot = NOT_LOADED;
  inflight = null;
}
