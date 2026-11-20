// Safari can suspend or 'interrupt' an AudioContext when the tab or window loses
// focus; the worklet then stops posting frames and ASR/diarization starve.
// Resume it whenever that happens while the session still wants audio.
export function keepAudioContextRunning(ctx: AudioContext, wanted: () => boolean): () => void {
  const onStateChange = () => {
    const state = ctx.state as string;
    if (state === 'running' || state === 'closed' || !wanted()) return;
    ctx.resume().catch((err) => console.warn('AudioContext resume after background suspend failed', err));
  };
  ctx.addEventListener('statechange', onStateChange);
  return () => ctx.removeEventListener('statechange', onStateChange);
}
