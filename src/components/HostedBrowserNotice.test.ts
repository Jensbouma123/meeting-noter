import { beforeEach, describe, expect, it } from 'vitest';
import { FakeHelperSocket, type FakeHelperMode } from '@/lib/meeting/helper-test-socket';
import { probeHelper, resetHelperReachability } from '@/lib/meeting/helper-source';
import { shouldShowSafariNotice } from './HostedBrowserNotice';

const WebSocket = FakeHelperSocket as unknown as new (url: string) => globalThis.WebSocket;

/** The notice decision with the page's helper probe running against a fake socket. */
function decide(mode: FakeHelperMode, hosted = true, safari = true) {
  FakeHelperSocket.reset(mode);
  return shouldShowSafariNotice(hosted, safari, () => probeHelper({ WebSocket, timeoutMs: 20 }));
}

beforeEach(() => resetHelperReachability());

describe('shouldShowSafariNotice', () => {
  it('hides the notice when the helper answers', async () => {
    expect(await decide('helper')).toBe(false);
  });

  it.each<FakeHelperMode>(['refused', 'hung', 'throws', 'old-protocol'])(
    'keeps the notice when the helper is unreachable (%s)',
    async (mode) => {
      expect(await decide(mode)).toBe(true);
    },
  );

  it('never shows off the hosted site or outside Safari, and does not probe then', async () => {
    let probed = false;
    const probe = async () => ((probed = true), false);
    expect(await shouldShowSafariNotice(false, true, probe)).toBe(false);
    expect(await shouldShowSafariNotice(true, false, probe)).toBe(false);
    expect(probed).toBe(false);
  });
});
