/**
 * Build-time flavour of the app. `PAGES=1` builds the static GitHub Pages
 * export (see next.config.ts); the local `npm run build` is unaffected.
 */
export const HOSTED = process.env.NEXT_PUBLIC_HOSTED === '1';

/** Placeholder `[sessionId]` segment the static export is generated for. */
export const HOSTED_SESSION_SLOT = '_';

/**
 * Router path of a session. A static export cannot enumerate runtime-generated
 * ids, so the hosted build serves one prerendered page and passes the id as
 * `?id=`. Local builds keep the path segment.
 */
export function sessionPath(sessionId: string): string {
  return HOSTED
    ? `/sessions/${HOSTED_SESSION_SLOT}?id=${encodeURIComponent(sessionId)}`
    : `/sessions/${sessionId}`;
}

/** Id of the session in the current route (segment, or `?id=` when hosted). */
export function resolveSessionId(segment: string | undefined, query: string | null): string | undefined {
  if (segment && segment !== HOSTED_SESSION_SLOT) return segment;
  return query ?? undefined;
}
