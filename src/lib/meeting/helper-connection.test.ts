import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectHelper, helperKnownReachable, probeHelper, resetHelperReachability } from './helper-connection';
import { HELPER_URL } from './helper-protocol';
import { FakeHelperSocket } from './helper-test-socket';

const WebSocket = FakeHelperSocket as unknown as new (url: string) => WebSocket;

beforeEach(() => {
  FakeHelperSocket.reset();
  resetHelperReachability();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('connectHelper', () => {
  it('connects to the fixed localhost port, asks to start, and resolves once the tap runs', async () => {
    const helper = await connectHelper({ WebSocket });
    const [ws] = FakeHelperSocket.instances;
    expect(ws.url).toBe(HELPER_URL);
    expect(ws.binaryType).toBe('arraybuffer');
    expect(ws.started).toBe(true);
    expect(helper.live).toBe(true);
    expect(helper.hello.permission).toBe('granted');
    expect(helperKnownReachable()).toBe(true);
  });

  it('rejects when the helper is not running, and remembers it', async () => {
    FakeHelperSocket.reset('refused');
    await expect(connectHelper({ WebSocket })).rejects.toThrow(/not running/);
    expect(helperKnownReachable()).toBe(false);
  });

  it('rejects when the socket cannot even be created (ws:// from an https page)', async () => {
    FakeHelperSocket.reset('throws');
    await expect(connectHelper({ WebSocket })).rejects.toThrow(/unreachable.*SecurityError/);
  });

  it('rejects without a WebSocket implementation', async () => {
    vi.stubGlobal('window', {});
    await expect(connectHelper()).rejects.toThrow(/WebSockets are not available/);
  });

  it('rejects a helper speaking another protocol version', async () => {
    FakeHelperSocket.reset('old-protocol');
    await expect(connectHelper({ WebSocket })).rejects.toThrow(/protocol 0/);
    expect(FakeHelperSocket.instances[0].closed).toBe(true);
  });

  it('rejects when the helper cannot start its tap', async () => {
    FakeHelperSocket.reset('tap-fails');
    await expect(connectHelper({ WebSocket })).rejects.toThrow(/Could not start the system audio tap/);
    expect(FakeHelperSocket.instances[0].closed).toBe(true);
  });

  it('gives up on a helper that never answers', async () => {
    vi.useFakeTimers();
    FakeHelperSocket.reset('hung');
    const p = connectHelper({ WebSocket, timeoutMs: 1000 });
    const settled = expect(p).rejects.toThrow(/did not answer/);
    await vi.advanceTimersByTimeAsync(1000);
    await settled;
    expect(FakeHelperSocket.instances[0].closed).toBe(true);
  });
});

describe('probeHelper', () => {
  it('finds a running helper without starting its tap', async () => {
    expect(await probeHelper({ WebSocket })).toBe(true);
    expect(FakeHelperSocket.instances[0].started).toBe(false);
    expect(FakeHelperSocket.instances[0].closed).toBe(true);
    expect(helperKnownReachable()).toBe(true);
  });

  it('never rejects, and records a missing helper', async () => {
    FakeHelperSocket.reset('refused');
    expect(await probeHelper({ WebSocket })).toBe(false);
    expect(helperKnownReachable()).toBe(false);
  });
});
