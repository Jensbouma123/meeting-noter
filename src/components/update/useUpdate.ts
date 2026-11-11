'use client';

import { useSyncExternalStore } from 'react';
import { findNewerRelease } from '../../lib/update/version.mjs';
import packageInfo from '../../../package.json';

export const UPDATE_REFRESH_MS = 6 * 60 * 60 * 1000;
export const UPDATE_DISMISSED_KEY = 'mn.update.dismissed';
const UPDATE_URL = '/api/app/update';
const CURRENT_VERSION = packageInfo.version;

export type UpdateInfo = {
  current: string;
  latest: string | null;
  available: boolean;
  name: string | null;
  notes: string | null;
  publishedAt: string | null;
  pageUrl: string;
  installKind: 'installer' | 'git' | 'source' | 'dev' | 'unknown';
  canApply: boolean;
  applyBlockedReason: string | null;
  restartAutomatic: boolean;
};

export type UpdateStatus = {
  state: 'idle' | 'running' | 'done' | 'failed';
  phase: 'starting' | 'downloading' | 'installing' | 'restarting' | 'model' | null;
  percent: number | null;
  message: string;
  fromVersion: string | null;
  toVersion: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  restartRequired: boolean;
  logTail: string;
};

export type UpdateSnapshot = {
  status: 'idle' | 'checking' | 'available' | 'error';
  info: UpdateInfo | null;
  dismissedVersion: string | null;
  applyStatus: UpdateStatus | null;
};

type UpdateResponse = Partial<UpdateInfo>;

const INITIAL: UpdateSnapshot = {
  status: 'idle',
  info: null,
  dismissedVersion: null,
  applyStatus: null,
};

let snapshot = INITIAL;
let checkPromise: Promise<void> | null = null;
let listeners = new Set<() => void>();
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function publish(next: UpdateSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function readDismissedVersion(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(UPDATE_DISMISSED_KEY);
  } catch {
    return null;
  }
}

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

async function releaseFallback(): Promise<void> {
  const release = await findNewerRelease(CURRENT_VERSION);
  if (!release) {
    publish({ ...snapshot, status: 'error', info: null });
    return;
  }

  publish({
    ...snapshot,
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

export async function checkForUpdate(): Promise<void> {
  if (checkPromise) return checkPromise;

  publish({ ...snapshot, status: 'checking' });
  checkPromise = (async () => {
    try {
      const response = await fetch(UPDATE_URL);
      if (!response.ok) throw new Error(`Update check failed: ${response.status}`);
      const info = normalizeInfo(await response.json() as UpdateResponse);
      publish({
        ...snapshot,
        status: info.available ? 'available' : 'idle',
        info,
        dismissedVersion: readDismissedVersion(),
      });
    } catch {
      await releaseFallback();
      if (snapshot.info) publish({ ...snapshot, dismissedVersion: readDismissedVersion() });
    } finally {
      checkPromise = null;
    }
  })();
  return checkPromise;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    publish({ ...snapshot, dismissedVersion: readDismissedVersion() });
    void checkForUpdate();
    refreshTimer = setInterval(() => { void checkForUpdate(); }, UPDATE_REFRESH_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };
}

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
  publish({ ...snapshot, applyStatus: data.status });
  return data.status;
}

export function dismissUpdate(version?: string): void {
  const dismissedVersion = version ?? snapshot.info?.latest ?? null;
  if (!dismissedVersion) return;
  try {
    localStorage.setItem(UPDATE_DISMISSED_KEY, dismissedVersion);
  } catch {
    // Keep the dismissal for this page session when storage is unavailable.
  }
  publish({ ...snapshot, dismissedVersion });
}

export function getUpdateSnapshot(): UpdateSnapshot {
  return snapshot;
}

export function subscribeToUpdate(listener: () => void): () => void {
  return subscribe(listener);
}

export function useUpdate(isRecording = false) {
  const state = useSyncExternalStore(subscribe, getUpdateSnapshot, () => INITIAL);

  return {
    ...state,
    blockedRecording: isRecording,
    dismiss: dismissUpdate,
    apply: applyUpdate,
    refresh: checkForUpdate,
  };
}
