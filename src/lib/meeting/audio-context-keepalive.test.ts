import { describe, expect, it, vi } from 'vitest';
import { keepAudioContextRunning } from './audio-context-keepalive';

class Ctx extends EventTarget {
  state = 'running';
  resume = vi.fn().mockResolvedValue(undefined);
  set(state: string) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

const asCtx = (c: Ctx) => c as unknown as AudioContext;

describe('keepAudioContextRunning', () => {
  it('resumes a context the browser suspends or interrupts in the background', () => {
    const ctx = new Ctx();
    keepAudioContextRunning(asCtx(ctx), () => true);
    ctx.set('suspended');
    ctx.set('interrupted');
    expect(ctx.resume).toHaveBeenCalledTimes(2);
  });

  it('leaves a user pause, a closed context, and a detached watcher alone', () => {
    const ctx = new Ctx();
    let wanted = false;
    const stop = keepAudioContextRunning(asCtx(ctx), () => wanted);
    ctx.set('suspended');
    wanted = true;
    ctx.set('closed');
    stop();
    ctx.set('suspended');
    expect(ctx.resume).not.toHaveBeenCalled();
  });
});
