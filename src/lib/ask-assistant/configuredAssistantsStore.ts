import { isAssistantId } from '@/lib/assistants/ids';
import type { AssistantInfo } from '@/lib/assistants/types';
import type { AskAssistantId, ConfiguredAssistants } from './types';

export const CONFIGURED_ASSISTANTS_KEY = 'meeting-noter.ask-assistants';

const NOT_LOADED: ConfiguredAssistants = { loaded: false, ids: [] };

const listeners = new Set<() => void>();
let snapshot = NOT_LOADED;
let restored = false;
let refreshed = false;
let inflight: Promise<void> | null = null;

function readRemembered(): AskAssistantId[] | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFIGURED_ASSISTANTS_KEY) ?? 'null') as unknown;
    return Array.isArray(parsed) ? parsed.filter(isAssistantId) : null;
  } catch {
    return null;
  }
}

function remember(ids: readonly AskAssistantId[]) {
  try {
    localStorage.setItem(CONFIGURED_ASSISTANTS_KEY, JSON.stringify(ids));
  } catch {
    return;
  }
}

function restoreRemembered() {
  if (restored) return;
  restored = true;
  const ids = readRemembered();
  if (ids) snapshot = { loaded: true, ids };
}

function publish(next: ConfiguredAssistants) {
  snapshot = next;
  listeners.forEach((notify) => notify());
}

function isInstalledAssistant(info: AssistantInfo): boolean {
  if (typeof info.installed === 'boolean') return info.installed;
  return info.status === 'connected' || info.status === 'installed';
}

async function fetchConnectedIds(): Promise<AskAssistantId[]> {
  const res = await fetch('/api/assistants');
  if (!res.ok) throw new Error('load');
  const body = (await res.json()) as { assistants: AssistantInfo[] };
  return body.assistants.filter((a) => isInstalledAssistant(a) && isAssistantId(a.id)).map((a) => a.id);
}

export function loadConfiguredAssistants(): Promise<void> {
  restoreRemembered();
  inflight ??= fetchConnectedIds()
    .then(
      (ids) => {
        remember(ids);
        publish({ loaded: true, ids });
      },
      () => publish({ loaded: true, ids: snapshot.ids }),
    )
    .finally(() => {
      refreshed = true;
      inflight = null;
    });
  return inflight;
}

export function subscribeConfiguredAssistants(onChange: () => void) {
  listeners.add(onChange);
  if (!refreshed) void loadConfiguredAssistants();
  return () => {
    listeners.delete(onChange);
  };
}

export function getConfiguredAssistants(): ConfiguredAssistants {
  restoreRemembered();
  return snapshot;
}

export function getServerConfiguredAssistants(): ConfiguredAssistants {
  return NOT_LOADED;
}

export function resetConfiguredAssistants() {
  snapshot = NOT_LOADED;
  restored = false;
  refreshed = false;
  inflight = null;
}
