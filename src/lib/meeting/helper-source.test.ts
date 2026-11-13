import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectHelper, resetHelperReachability } from './helper-connection';
import { FakeHelperSocket, helperFrame } from './helper-test-socket';

const WebSocket = FakeHelperSocket as unknown as new (url: string) => WebSocket;

beforeEach(() => {
  FakeHelperSocket.reset();
  resetHelperReachability();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('HelperSource frames', () => {
  it('delivers 1600-sample Int16 frames with their RMS', async () => {
    const helper = await connectHelper({ WebSocket });
    const frames: { samples: Int16Array; rms: number }[] = [];
    helper.onFrame = (pcm, rms) => frames.push({ samples: new Int16Array(pcm), rms });
    FakeHelperSocket.instances[0].samples(helperFrame(16384));
    expect(frames).toHaveLength(1);
    expect(frames[0].samples).toHaveLength(1600);
    expect(frames[0].samples[0]).toBe(16384);
    expect(frames[0].rms).toBeCloseTo(0.5, 5);
  });

  it('re-cuts messages that split or join frames into whole 1600-sample frames', async () => {
    const helper = await connectHelper({ WebSocket });
    const frames: Int16Array[] = [];
    helper.onFrame = (pcm) => frames.push(new Int16Array(pcm));
    const ws = FakeHelperSocket.instances[0];
    const run = new Int16Array(4000).map((_, i) => i % 1000);
    ws.samples(run.subarray(0, 700));
    ws.samples(run.subarray(700, 3900));
    ws.samples(run.subarray(3900));
    expect(frames).toHaveLength(2);
    expect(frames.every((f) => f.length === 1600)).toBe(true);
    expect([...frames[0]]).toEqual([...run.subarray(0, 1600)]);
    expect([...frames[1]]).toEqual([...run.subarray(1600, 3200)]);
    ws.samples(new Int16Array(800).fill(7));
    expect(frames).toHaveLength(3);
    expect([...frames[2].subarray(0, 800)]).toEqual([...run.subarray(3200, 4000)]);
    expect(frames[2][800]).toBe(7);
  });

  it('drops frames until a consumer is set, as an unattached worklet posts none', async () => {
    const helper = await connectHelper({ WebSocket });
    FakeHelperSocket.instances[0].samples(helperFrame(100));
    const onFrame = vi.fn();
    helper.onFrame = onFrame;
    FakeHelperSocket.instances[0].samples(helperFrame(100));
    expect(onFrame).toHaveBeenCalledTimes(1);
  });
});

describe('HelperSource lifetime', () => {
  it('reports the helper quitting mid-stream once', async () => {
    const helper = await connectHelper({ WebSocket });
    const onEnded = vi.fn();
    helper.onEnded = onEnded;
    FakeHelperSocket.instances[0].drop();
    FakeHelperSocket.instances[0].drop();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(helper.live).toBe(false);
  });

  it('reports a tap error after start as the end of the stream', async () => {
    const helper = await connectHelper({ WebSocket });
    const onEnded = vi.fn();
    helper.onEnded = onEnded;
    FakeHelperSocket.instances[0].text({ type: 'error', message: 'tap died' });
    expect(onEnded).toHaveBeenCalledWith('tap died');
  });

  it('asks for the mic only when told to, and tracks its state', async () => {
    const plain = await connectHelper({ WebSocket });
    expect(FakeHelperSocket.instances[0].askedMic).toBe(false);
    expect(plain.mic).toBeNull();
    FakeHelperSocket.mic = 'unknown';
    const helper = await connectHelper({ WebSocket, mic: true });
    const ws = FakeHelperSocket.instances[1];
    expect(ws.askedMic).toBe(true);
    expect(helper.mic).toEqual({ state: 'unknown', permission: 'granted' });
    const onMicChange = vi.fn();
    helper.onMicChange = onMicChange;
    ws.text({ type: 'mic', mic: 'unavailable', micError: 'unplugged', micPermission: 'granted' });
    expect(onMicChange).toHaveBeenCalledWith({ state: 'unavailable', permission: 'granted', error: 'unplugged' });
    expect(helper.live).toBe(true);
  });

  it('treats a helper that predates the mic as having none', async () => {
    FakeHelperSocket.mic = undefined;
    const helper = await connectHelper({ WebSocket, mic: true });
    expect(helper.mic?.state).toBe('unavailable');
    expect(helper.mic?.error).toMatch(/rebuild/);
  });

  it('close() asks the helper to stop, closes the socket and stays quiet', async () => {
    const helper = await connectHelper({ WebSocket });
    const onEnded = vi.fn();
    const onFrame = vi.fn();
    helper.onEnded = onEnded;
    helper.onFrame = onFrame;
    helper.close();
    const ws = FakeHelperSocket.instances[0];
    expect(ws.sent.map((m) => JSON.parse(m).type)).toEqual(['start', 'stop']);
    expect(ws.closed).toBe(true);
    ws.samples(helperFrame(100));
    ws.drop();
    expect(onFrame).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
  });
});
