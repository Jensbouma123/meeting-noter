import { closeAudioContext, createAudioContext, prepareAudioContext, resumeAudioContext, suspendAudioContext } from './audio-context';
import { readSources } from './capture-diagnostics';
import { reopenMicWithoutEchoCancellation } from './mic-reopen';
import { requestSources } from './request-sources';
import { attachRequestedSources } from './requested-attach';
import { settleSources } from './settle-requests';
import { attachStreamSource } from './source-attach';
import type { AttachHost } from './types/source-attach';
import { SourceAcquirer } from './source-acquirer';
import { teardownSource } from './source-teardown';
import { MicSilenceWatch, ShareSilenceWatch } from './silence-watchers';
import type { CaptureMode, Source } from './types/basics';
import type { CaptureDiagnostics, FrameHandler, SourceNodes } from './types/capture';

export class Capture {
  private ctx: AudioContext | null = null;
  private sources = new Map<Source, SourceNodes>();
  private acquirer = new SourceAcquirer();
  private shareWatch: ShareSilenceWatch;
  private micWatch: MicSilenceWatch;
  private attachHost: AttachHost;
  private shareError: string | null = null;
  private systemVia: 'share' | 'helper' | null = null;
  private micReopens = 0;
  warning: string | null = null;

  constructor(private handler: FrameHandler) {
    this.shareWatch = new ShareSilenceWatch({
      canSwapMic: () => this.sources.has('mic') && this.acquirer.micCancelsEcho,
      swapMic: () => void this.hearSpeakersViaMic(),
      onCallAudioSilent: (silent) => handler.onCallAudioSilent?.(silent),
    });
    this.micWatch = new MicSilenceWatch((warning) => handler.onWarning?.(warning));
    this.attachHost = {
      handler,
      sources: this.sources,
      watchShare: (rms) => this.shareWatch.feed(rms),
      watchMic: (rms) => this.micWatch.feed(rms),
      setWarning: (warning) => {
        this.warning = warning;
      },
    };
  }

  get activeSources(): Source[] {
    return [...this.sources.keys()];
  }

  private resetSessionState(): void {
    this.shareWatch.reset();
    this.micWatch.reset();
    this.shareError = null;
    this.micReopens = 0;
    this.systemVia = null;
    this.warning = null;
  }

  async start(mode: CaptureMode, micDeviceId?: string): Promise<void> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      throw new Error('Audio capture is only available in the browser');
    }
    const run = this.acquirer.begin(mode, micDeviceId);
    this.resetSessionState();
    const ctx = createAudioContext();
    this.ctx = ctx;
    const { micP, systemP } = requestSources(this.acquirer, run, mode, micDeviceId);
    try {
      const [micR, sysR] = await Promise.allSettled([
        micP ?? Promise.resolve(null),
        systemP ?? Promise.resolve(null),
      ]);
      if (this.acquirer.isStale(run)) return;
      const { mic, system } = settleSources(mode, micR, sysR, (message) => {
        this.shareError = message;
      });
      await prepareAudioContext(ctx);
      if (this.acquirer.isStale(run)) return;
      const outcome = attachRequestedSources(this.attachHost, ctx, mic, system);
      if (outcome.warning !== null) this.warning = outcome.warning;
      if (outcome.systemVia) this.systemVia = outcome.systemVia;
      if (system) this.shareWatch.arm();
    } catch (err) {
      micP?.catch(() => {});
      systemP?.catch(() => {});
      if (!this.acquirer.isStale(run)) await this.dispose();
      throw err;
    }
  }

  private async hearSpeakersViaMic(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.sources.has('mic')) return;
    const stream = await reopenMicWithoutEchoCancellation(this.acquirer, () => this.sources.has('mic'));
    if (!stream) return;
    this.dropSource('mic');
    attachStreamSource(this.attachHost, ctx, 'mic', stream);
    this.acquirer.micCancelsEcho = false;
    this.micReopens += 1;
    this.shareWatch.flaggedSilent = true;
    console.info('[capture] Shared call audio is silent; the mic now hears the speakers');
    this.handler.onCallAudioSilent?.(true);
  }

  diagnostics(): CaptureDiagnostics {
    return {
      mode: this.acquirer.mode,
      contextState: this.ctx?.state ?? null,
      contextSampleRate: this.ctx?.sampleRate ?? null,
      displaySurface: this.acquirer.displaySurface,
      shareError: this.shareError,
      callAudioUnsupported: this.acquirer.callAudioUnsupported,
      systemVia: this.systemVia,
      micCancelsEcho: this.acquirer.micCancelsEcho,
      micReopens: this.micReopens,
      shareSilent: this.shareWatch.flaggedSilent,
      sources: readSources(this.sources),
    };
  }

  dropSource(source: Source): void {
    const entry = this.sources.get(source);
    if (!entry) return;
    this.sources.delete(source);
    teardownSource(entry, this.acquirer);
  }

  suspend(): Promise<void> {
    return suspendAudioContext(this.ctx);
  }

  resume(): Promise<void> {
    return resumeAudioContext(this.ctx);
  }

  async dispose(): Promise<void> {
    this.acquirer.releaseAll();
    this.shareWatch.disarm();
    for (const source of [...this.sources.keys()]) this.dropSource(source);
    this.acquirer.stopEverything();
    const ctx = this.ctx;
    this.ctx = null;
    await closeAudioContext(ctx);
  }
}
