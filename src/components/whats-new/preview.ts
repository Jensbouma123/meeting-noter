import { useSyncExternalStore } from 'react';

import type { PreviewKind } from './whatsNew.types';

export const SAMPLE_NOTES = `## What's new

- **Faster** transcripts on long meetings
- A new \`Share\` dialog with [a preview](https://example.com)
- Fixed a rare crash when stopping a recording`;

export function bumpPatch(version: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : version;
}

export function readPreview(search: string): PreviewKind | null {
  const value = new URLSearchParams(search).get('preview');
  return value === 'update' || value === 'whats-new' ? value : null;
}

const noopSubscribe = () => () => {};

export function usePreview(): PreviewKind | null {
  return useSyncExternalStore(noopSubscribe, () => readPreview(window.location.search), () => null);
}
