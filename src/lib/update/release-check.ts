import bundled from '../../../release-notes.json';
import { MAX_NOTES } from './constants';
import type { ApplyBlockedReason, InstallInfo, Release, UpdateCheck } from './types';
import { findNewerRelease, installerAssetsReady, RELEASES_API } from './version.mjs';

function blockedReason(info: InstallInfo, running: boolean): ApplyBlockedReason | null {
  if (running) return 'already-running';
  if (info.kind === 'dev') return 'dev-mode';
  if (info.kind === 'unknown') return 'unsupported-install';
  return null;
}

export function buildCheck(info: InstallInfo, rel: Release | null, running: boolean): UpdateCheck {
  const available = !!rel && (info.kind !== 'installer' || installerAssetsReady(rel.assetNames, info.arch));
  const blocked = available ? blockedReason(info, running) : null;
  return {
    current: info.current,
    latest: available ? rel.version : null,
    available,
    name: available ? rel.name : null,
    notes: available ? (rel.notes ?? (bundled as Record<string, string>)[rel.version] ?? null)?.slice(0, MAX_NOTES) ?? null : null,
    publishedAt: available ? rel.publishedAt : null,
    pageUrl: available ? rel.pageUrl : null,
    installKind: info.kind,
    canApply: available && blocked === null,
    applyBlockedReason: blocked,
    restartAutomatic: info.kind === 'installer',
  };
}

export async function fetchRelease(current: string, fetchFn?: typeof fetch): Promise<Release | null> {
  return findNewerRelease(current, { fetchFn, url: process.env.MEETING_NOTER_RELEASES_URL || RELEASES_API });
}
