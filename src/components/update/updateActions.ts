import { UPDATE_DISMISSED_KEY, UPDATE_URL } from './constants';
import { getUpdateSnapshot, publish } from './updateState';
import type { UpdateStatus } from './types';

export async function applyUpdate(): Promise<UpdateStatus> {
  const response = await fetch(UPDATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Meeting-Noter': '1' },
    body: '{}',
  });
  const data = await response.json() as { status?: UpdateStatus; error?: string };
  if (!data.status || (!response.ok && !(response.status === 409 && data.status.state === 'running'))) {
    throw new Error(data.error ?? `Update apply failed: ${response.status}`);
  }
  publish({ ...getUpdateSnapshot(), applyStatus: data.status });
  return data.status;
}

export function dismissUpdate(version?: string): void {
  const snapshot = getUpdateSnapshot();
  const dismissedVersion = version ?? snapshot.info?.latest ?? null;
  if (!dismissedVersion) return;
  try {
    localStorage.setItem(UPDATE_DISMISSED_KEY, dismissedVersion);
  } catch {
    publish({ ...snapshot, dismissedVersion });
    return;
  }
  publish({ ...snapshot, dismissedVersion });
}
