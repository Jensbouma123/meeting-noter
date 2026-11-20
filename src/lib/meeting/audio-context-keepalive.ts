import { resumeAudioContext, suspendAudioContext } from './audio-context';

export function keepAudioContextRunning(ctx: AudioContext, wanted: () => boolean): () => void {
  const onStateChange = () => {
    const state = ctx.state as string;
    if (state === 'running' || state === 'closed' || !wanted()) return;
    ctx.resume().catch((err) => console.warn('AudioContext resume after background suspend failed', err));
  };
  ctx.addEventListener('statechange', onStateChange);
  return () => ctx.removeEventListener('statechange', onStateChange);
}

export class AudioContextKeepAlive {
  private wanted = true;
  private unwatch: (() => void) | null = null;

  watch(ctx: AudioContext): void {
    this.release();
    this.wanted = true;
    this.unwatch = keepAudioContextRunning(ctx, () => this.wanted);
  }

  suspend(ctx: AudioContext | null): Promise<void> {
    this.wanted = false;
    return suspendAudioContext(ctx);
  }

  resume(ctx: AudioContext | null): Promise<void> {
    this.wanted = true;
    return resumeAudioContext(ctx);
  }

  release(): void {
    this.unwatch?.();
    this.unwatch = null;
  }
}
