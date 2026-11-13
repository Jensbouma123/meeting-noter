export function createAudioContext(): AudioContext {
  const Ctx = window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('Web Audio is not supported in this browser');
  return new Ctx();
}

export async function prepareAudioContext(ctx: AudioContext): Promise<void> {
  try {
    await ctx.audioWorklet.addModule('/worklets/pcm16.js');
  } catch (err) {
    throw new Error(`Failed to load audio worklet: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {}
  }
}

export async function suspendAudioContext(ctx: AudioContext | null): Promise<void> {
  try {
    await ctx?.suspend();
  } catch {}
}

export async function resumeAudioContext(ctx: AudioContext | null): Promise<void> {
  try {
    await ctx?.resume();
  } catch {}
}

export async function closeAudioContext(ctx: AudioContext | null): Promise<void> {
  try {
    await ctx?.close();
  } catch {}
}
