import { describe, expect, it } from 'vitest';
import { IdleTracker } from './idle-shutdown';
import { parseBeat } from './parse-beat';

function setup() {
  let t = 1_000_000;
  const clock = { advance: (ms: number) => (t += ms) };
  const tracker = new IdleTracker({ now: () => t, staleMs: 120_000, recordingStaleMs: 900_000, closeGraceMs: 15_000 });
  return { tracker, clock };
}

describe('IdleTracker', () => {
  it('never shuts down before the first heartbeat', () => {
    const { tracker, clock } = setup();
    clock.advance(24 * 3600_000);
    expect(tracker.shouldShutdown()).toBe(false);
  });

  it('keeps running while a tab beats and stops once its beats go stale', () => {
    const { tracker, clock } = setup();
    tracker.beat('tab');
    clock.advance(119_000);
    expect(tracker.shouldShutdown()).toBe(false);
    tracker.beat('tab');
    clock.advance(119_000);
    expect(tracker.shouldShutdown()).toBe(false);
    clock.advance(1_000);
    expect(tracker.shouldShutdown()).toBe(true);
  });

  it('survives a reload: closing then beating again within the grace period', () => {
    const { tracker, clock } = setup();
    tracker.beat('tab');
    tracker.beat('tab', { closing: true });
    clock.advance(3_000);
    tracker.beat('tab');
    clock.advance(60_000);
    expect(tracker.shouldShutdown()).toBe(false);
  });

  it('stops shortly after the last tab closes, not after the stale timeout', () => {
    const { tracker, clock } = setup();
    tracker.beat('tab');
    tracker.beat('tab', { closing: true });
    clock.advance(14_999);
    expect(tracker.shouldShutdown()).toBe(false);
    clock.advance(1);
    expect(tracker.shouldShutdown()).toBe(true);
  });

  it('keeps running while another tab is still open', () => {
    const { tracker, clock } = setup();
    tracker.beat('a');
    tracker.beat('b');
    tracker.beat('a', { closing: true });
    clock.advance(60_000);
    expect(tracker.openClients()).toBe(1);
    expect(tracker.shouldShutdown()).toBe(false);
  });

  it('does not shut down during a recording even when beats are throttled', () => {
    const { tracker, clock } = setup();
    tracker.beat('tab', { recording: true });
    clock.advance(10 * 60_000);
    expect(tracker.recording()).toBe(true);
    expect(tracker.shouldShutdown()).toBe(false);
    tracker.beat('tab', { recording: false });
    expect(tracker.recording()).toBe(false);
    clock.advance(120_000);
    expect(tracker.shouldShutdown()).toBe(true);
  });

  it('a closing tab no longer counts as recording', () => {
    const { tracker, clock } = setup();
    tracker.beat('tab', { recording: true });
    tracker.beat('tab', { recording: true, closing: true });
    expect(tracker.recording()).toBe(false);
    clock.advance(15_000);
    expect(tracker.shouldShutdown()).toBe(true);
  });

  it('never shuts down while busy (an update is running)', () => {
    const { tracker, clock } = setup();
    tracker.beat('tab', { closing: true });
    clock.advance(3600_000);
    expect(tracker.shouldShutdown({ busy: true })).toBe(false);
    expect(tracker.shouldShutdown({ busy: false })).toBe(true);
  });
});

describe('parseBeat', () => {
  it('reads the fetch and sendBeacon bodies', () => {
    expect(parseBeat('{"clientId":"ab-1_C","recording":true}')).toEqual({
      clientId: 'ab-1_C',
      beat: { recording: true, closing: false },
    });
    expect(parseBeat('{"clientId":"x","closing":true}')?.beat).toEqual({ recording: false, closing: true });
  });

  it('rejects junk and unsafe ids', () => {
    expect(parseBeat('nope')).toBeNull();
    expect(parseBeat('null')).toBeNull();
    expect(parseBeat('{"clientId":""}')).toBeNull();
    expect(parseBeat('{"clientId":"../etc"}')).toBeNull();
    expect(parseBeat(`{"clientId":"${'a'.repeat(65)}"}`)).toBeNull();
  });
});
