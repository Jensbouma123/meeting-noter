import { API_PATH } from './constants';
import { mergeEntries } from './merge-entries';
import { requestExport } from './request-export';
import type { LegacyFetch as Fetch, LegacyRequestExport as RequestExport } from './types';

export async function importLegacyOrigin(
  win: Window = window,
  fetchFn: Fetch = fetch,
  request: RequestExport = requestExport,
): Promise<number | null> {
  const status = await fetchFn(API_PATH, { cache: 'no-store' });
  if (!status.ok) return null;
  const { state } = (await status.json()) as { state?: string };
  if (state !== 'listening') return null;
  const entries = await request(win);
  if (!entries) return null;
  const written = mergeEntries(win.localStorage, entries);
  await fetchFn(API_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return written;
}
