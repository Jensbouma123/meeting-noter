import { findNewerRelease } from '../../lib/update/version.mjs';
import { CURRENT_VERSION, UPDATE_URL } from './constants';
import { getUpdateSnapshot, publish, readDismissedVersion } from './updateState';
import type { UpdateInfo, UpdateResponse } from './types';

let checkPromise: Promise<void> | null = null;

function normalizeInfo(data: UpdateResponse): UpdateInfo {
  return {
    current: data.current ?? CURRENT_VERSION,
    latest: data.latest ?? null,
    available: data.available ?? false,
    name: data.name ?? null,
    notes: data.notes ?? null,
    publishedAt: data.publishedAt ?? null,
    pageUrl: data.pageUrl ?? '',
    installKind: data.installKind ?? 'unknown',
    canApply: data.canApply ?? false,
    applyBlockedReason: data.applyBlockedReason ?? null,
    restartAutomatic: data.restartAutomatic ?? false,
  };
}

async function publishLatestReleaseFromGithub(): Promise<void> {
  const release = await findNewerRelease(CURRENT_VERSION);
  if (!release) {
    publish({ ...getUpdateSnapshot(), status: 'error', info: null });
    return;
  }

  publish({
    ...getUpdateSnapshot(),
    status: 'available',
    info: {
      current: CURRENT_VERSION,
      latest: release.version,
      available: true,
      name: release.name,
      notes: release.notes,
      publishedAt: release.publishedAt,
      pageUrl: release.pageUrl ?? '',
      installKind: 'unknown',
      canApply: false,
      applyBlockedReason: null,
      restartAutomatic: false,
    },
  });
}

export async function checkForUpdate(manual = false): Promise<void> {
  if (checkPromise) return checkPromise;

  publish({ ...getUpdateSnapshot(), status: 'checking' });
  checkPromise = (async () => {
    try {
      const response = await fetch(manual ? `${UPDATE_URL}?refresh=1` : UPDATE_URL);
      if (!response.ok) throw new Error(`Update check failed: ${response.status}`);
      const info = normalizeInfo(await response.json() as UpdateResponse);
      publish({
        ...getUpdateSnapshot(),
        status: info.available ? 'available' : 'idle',
        info,
        dismissedVersion: readDismissedVersion(),
      });
    } catch {
      await publishLatestReleaseFromGithub();
      if (getUpdateSnapshot().info) publish({ ...getUpdateSnapshot(), dismissedVersion: readDismissedVersion() });
    } finally {
      checkPromise = null;
    }
  })();
  return checkPromise;
}
