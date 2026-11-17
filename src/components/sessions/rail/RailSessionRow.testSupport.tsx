import { afterEach, beforeEach, vi } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { bindTranscriptSession } from '@/lib/meeting/transcript-session';
import { clearIdleSession } from '@/lib/meeting/session-reset';
import { setState } from '@/lib/meeting/store-core';
import { RailSessionRow } from './RailSessionRow';

export const noop = () => {};

export function row(session: SessionMetadata, props: { isActive?: boolean; pathLabel?: string } = {}) {
  return (
    <RailSessionRow
      session={session}
      isActive={props.isActive ?? true}
      onOpen={noop}
      onClear={noop}
      onDelete={noop}
      pathLabel={props.pathLabel}
    />
  );
}

export function installRailRowLifecycle() {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    act(() => {
      setState({ status: 'idle' });
      clearIdleSession();
      bindTranscriptSession(null);
    });
    vi.unstubAllGlobals();
    cleanup();
  });
}
