import type { HelperSource } from './helper-source';
import { countFrame, newStats } from './capture-readout';
import { helperMicUsable, safariMicWarning } from './safari-mic-warning';
import type { FrameHandler, SourceNodes } from './types/capture';
import type { Source } from './types/basics';

export interface AttachHost {
  handler: FrameHandler;
  sources: Map<Source, SourceNodes>;
  watchShare(rms: number): void;
  watchMic(rms: number): void;
  setWarning(warning: string): void;
}

export function attachHelperSource(host: AttachHost, helper: HelperSource, source: Source): void {
  const stats = newStats();
  const ended = (): void => {
    const current = host.sources.get(source);
    if (current?.kind === 'helper' && current.helper === helper) host.handler.onSourceEnded(source);
  };
  helper.onFrame = (pcm, rms) => {
    countFrame(stats, rms);
    host.handler.onLevel(source, rms);
    host.handler.onFrame(source, pcm);
    if (source === 'system') host.watchShare(rms);
  };
  helper.onEnded = ended;
  helper.onMicChange = (mic) => {
    const warning = safariMicWarning(mic, source === 'mic');
    host.setWarning(warning);
    console.info(`[capture] Helper mic is now ${mic.state}${mic.error ? `: ${mic.error}` : ''}`);
    if (!helperMicUsable(mic)) host.handler.onWarning?.(warning);
  };
  host.sources.set(source, { kind: 'helper', helper, stats });
  if (!helper.live) queueMicrotask(ended);
}

export function attachStreamSource(host: AttachHost, ctx: AudioContext, source: Source, stream: MediaStream): void {
  const ctxSource = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm16', {
    processorOptions: { inputSampleRate: ctx.sampleRate },
  });
  const stats = newStats();
  const onMessage = (ev: MessageEvent): void => {
    const data = ev.data as { type?: string; pcm?: ArrayBuffer; rms?: number };
    if (!data || data.type !== 'frame' || !(data.pcm instanceof ArrayBuffer)) return;
    const rms = typeof data.rms === 'number' ? data.rms : 0;
    countFrame(stats, rms);
    host.handler.onLevel(source, rms);
    host.handler.onFrame(source, data.pcm);
    if (source === 'system') host.watchShare(rms);
    else host.watchMic(rms);
  };
  node.port.onmessage = onMessage;
  ctxSource.connect(node);
  host.sources.set(source, { kind: 'stream', stream, ctxSource, node, onMessage, stats });
  for (const track of stream.getTracks()) {
    track.onended = () => {
      const current = host.sources.get(source);
      if (current?.kind === 'stream' && current.stream === stream) host.handler.onSourceEnded(source);
    };
  }
}
