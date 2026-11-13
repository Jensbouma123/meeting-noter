import bundled from '../../../release-notes.json';
import { MAX_NOTES, RELEASE_BY_TAG_API } from './constants';

type Fetched = { notes: string | null; pageUrl: string | null };

export async function fetchReleaseNotes(version: string, fetchFn: typeof fetch = fetch): Promise<Fetched> {
  const local = (bundled as Record<string, string>)[version] ?? null;
  try {
    const res = await fetchFn(`${RELEASE_BY_TAG_API}v${version}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { notes: local, pageUrl: null };
    const rel = await res.json() as { body?: unknown; html_url?: unknown };
    const body = typeof rel.body === 'string' && rel.body.trim() ? rel.body.slice(0, MAX_NOTES) : local;
    return { notes: body, pageUrl: typeof rel.html_url === 'string' ? rel.html_url : null };
  } catch {
    return { notes: local, pageUrl: null };
  }
}
