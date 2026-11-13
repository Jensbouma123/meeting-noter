import { isSafariEngine } from '@/lib/asr/browser/is-safari-engine';
import { connectHelper, helperKnownReachable, probeHelper, type HelperMic, type HelperSource } from './helper-source';
import type { Source } from './types';

export interface FrameHandler {
  onFrame(source: Source, pcm: ArrayBuffer): void;
  onLevel(source: Source, rms: number): void;
  /** Fired when a track ends (e.g. user stops sharing) so the session can degrade gracefully. */
  onSourceEnded(source: Source): void;
  /**
   * Fired with `true` when the shared call audio has stayed silent long
   * enough that the mic was switched to hearing the speakers (see
   * `Capture.watchShare`), and with `false` if the share is heard after all.
   */
  onCallAudioSilent?(silent: boolean): void;
  /**
   * A problem found mid-session that leaves the user's voice out: the mic
   * delivers only digital silence (`SILENT_MIC_FRAMES`), or the helper's mic
   * went silent, lost its permission or its device.
   */
  onWarning?(warning: string): void;
}

/**
 * Frame RMS at or above which the share carries sound (about -80 dBFS). An
 * idle tab, a share whose audio the browser leaves out, or the wrong tab
 * delivers exact digital silence; any real playback, even room tone in a
 * call, sits well above this.
 */
export const SHARE_SOUND_RMS = 1e-4;
/** Capture frames (100 ms each) a share may stay silent before the mic
 *  takes over hearing the call. */
export const SILENT_SHARE_FRAMES = 100;
/**
 * Capture frames (100 ms each) of exact digital zero, from the start, after
 * which the mic is reported as recording nothing. A working mic delivers its
 * noise floor when it opens; only a muted input, a track the OS gives no
 * sound (no Microphone permission) or a device that went away delivers only
 * zeros. Later zeros from a mic that has delivered sound are its processing
 * gating quiet, not a dead input (`watchMic`).
 */
export const SILENT_MIC_FRAMES = 30;

export const SILENT_MIC_WARNING =
  'Your microphone delivers only silence, so your own voice is not transcribed. Check that the input is not muted and is the microphone you speak into (System Settings → Sound → Input), and that this browser may use it (System Settings → Privacy & Security → Microphone).';

/** The track settings the diagnostics readout shows (`getSettings()`). */
export interface TrackReadout {
  label: string;
  readyState: string;
  muted: boolean;
  enabled: boolean;
  deviceId?: string;
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean | string;
  autoGainControl?: boolean;
  noiseSuppression?: boolean;
}

/** What one source has delivered so far (`Capture.diagnostics`). */
export interface SourceReadout {
  tracks: TrackReadout[];
  /** Worklet frames (100 ms) posted. */
  frames: number;
  /** Frames that were exact digital zero: a share the browser or the OS
   *  hands over without its sound delivers only these. */
  zeroFrames: number;
  /** Frames at or above `SHARE_SOUND_RMS`. */
  soundFrames: number;
  /** RMS of the last frame and the loudest of the last second. */
  rms: number;
  peakRms: number;
}

/** Live capture state for the dev diagnostics readout. */
export interface CaptureDiagnostics {
  mode: 'mic' | 'system' | 'both' | null;
  contextState: string | null;
  contextSampleRate: number | null;
  /** The surface the user picked in the share picker (`browser`, `window`,
   *  `monitor`), when the browser reports it. */
  displaySurface: string | null;
  /** Why the share did not attach, when it did not. */
  shareError: string | null;
  /** Both mode in Safari never asks for a share: WebKit gives pages no call
   *  audio. Set only when the system audio helper did not answer either. */
  callAudioUnsupported: boolean;
  /** Where the call audio comes from: a getDisplayMedia share, or the
   *  native system audio helper (`helper-source.ts`). */
  systemVia?: 'share' | 'helper' | null;
  micCancelsEcho: boolean;
  /** Times the mic was asked for again mid-session (`hearSpeakersViaMic`). */
  micReopens: number;
  /** The share is attached and has stayed silent (`onCallAudioSilent`). */
  shareSilent: boolean;
  sources: Partial<Record<Source, SourceReadout>>;
}

interface StreamNodes {
  kind: 'stream';
  stream: MediaStream;
  ctxSource: MediaStreamAudioSourceNode;
  node: AudioWorkletNode;
  onMessage: (ev: MessageEvent) => void;
  stats: SourceStats;
}

/** Call audio from the native helper: frames arrive ready-made, no worklet. */
interface HelperNodes {
  kind: 'helper';
  helper: HelperSource;
  stats: SourceStats;
}

type SourceNodes = StreamNodes | HelperNodes;

/**
 * Safari in Mic mode with no helper to record the mic: how to start it.
 * Dutch, as the launcher and its README are.
 */
export const SAFARI_MIC_NEEDS_HELPER =
  'Safari opent je microfoon niet zelf, omdat dat de microfoon en camera van een andere gesprek-app kan onderbreken. Meeting Noter neemt je microfoon daarom op via de audiohelper, maar die draait niet. Sluit Meeting Noter en start het opnieuw door op ‘Start Meeting Noter.command’ te dubbelklikken (of met `npm run app` in Terminal), en druk dan weer op Record.';

/** Whether the helper's mic can record the user at all. */
function helperMicUsable(mic: HelperMic | null): boolean {
  return !!mic && (mic.state === 'live' || mic.state === 'unknown');
}

/**
 * What Safari tells the user about their voice, which only the helper
 * records (Safari never opens the mic, see `Capture.start`): mixed into the
 * call audio in Both mode, `alone` in Mic mode.
 */
export function safariMicWarning(mic: HelperMic | null, alone = false): string {
  if (helperMicUsable(mic)) {
    return alone
      ? 'Safari can interrupt the microphone and camera in another call app, so Safari does not open your microphone: the system audio helper records it instead. Your other call keeps its microphone.'
      : 'Safari can interrupt the microphone and camera in another call app, so Safari does not open your microphone: the system audio helper records it instead, mixed with the call audio, so your words appear among the call’s speakers. Your other call keeps its microphone.';
  }
  const why =
    mic?.state === 'denied'
      ? 'the helper has no Microphone permission (System Settings → Privacy & Security → Microphone)'
      : mic?.state === 'silent'
        ? 'the helper’s microphone delivers only silence — macOS has not given the helper Microphone permission (System Settings → Privacy & Security → Microphone: allow Meeting Noter Audio Helper, then restart it), or the input is muted'
        : `the helper could not open it${mic?.error ? ` (${mic.error})` : ''}`;
  return alone
    ? `Your microphone is not recorded: ${why}. Safari does not open it because it can interrupt the microphone and camera in another call app.`
    : `Your microphone is not recorded: ${why}. Safari does not open it because it can interrupt the microphone and camera in another call app, so this recording captures system audio only.`;
}

/** What a call audio request yields. */
type SystemInput = MediaStream | HelperSource;

function isStream(input: SystemInput): input is MediaStream {
  return typeof (input as MediaStream).getTracks === 'function';
}

function helperReadout(helper: HelperSource, source: Source): TrackReadout {
  return {
    label: source === 'mic'
      ? `System audio helper (mic alone: ${helper.mic?.state ?? 'unavailable'})`
      : helper.mic ? `System audio helper (Core Audio tap + mic: ${helper.mic.state})` : 'System audio helper (Core Audio tap)',
    readyState: helper.live ? 'live' : 'ended',
    muted: helper.hello.permission === 'denied',
    enabled: true,
    sampleRate: helper.hello.sampleRate,
    channelCount: 1,
  };
}

interface SourceStats {
  frames: number;
  zeroFrames: number;
  soundFrames: number;
  rms: number;
  /** Loudest frame of the current second (ten frames). */
  peakRms: number;
  peakWindow: number;
}

function trackReadout(track: MediaStreamTrack): TrackReadout {
  const settings = (track.getSettings?.() ?? {}) as MediaTrackSettings & { echoCancellation?: boolean | string };
  return {
    label: track.label ?? '',
    readyState: track.readyState ?? 'unknown',
    muted: track.muted ?? false,
    enabled: track.enabled ?? true,
    deviceId: settings.deviceId,
    sampleRate: settings.sampleRate,
    channelCount: settings.channelCount,
    echoCancellation: settings.echoCancellation,
    autoGainControl: settings.autoGainControl,
    noiseSuppression: settings.noiseSuppression,
  };
}

function countFrame(stats: SourceStats, rms: number): void {
  stats.frames += 1;
  if (rms === 0) stats.zeroFrames += 1;
  if (rms >= SHARE_SOUND_RMS) stats.soundFrames += 1;
  stats.rms = rms;
  if (stats.peakWindow % 10 === 0) stats.peakRms = 0;
  stats.peakWindow += 1;
  stats.peakRms = Math.max(stats.peakRms, rms);
}

function newStats(): SourceStats {
  return { frames: 0, zeroFrames: 0, soundFrames: 0, rms: 0, peakRms: 0, peakWindow: 0 };
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Ignore; track may already be stopped.
    }
  }
}

/**
 * Browser audio capture. Owns one AudioContext shared by all sources plus
 * one AudioWorkletNode per source. Teardown stops every node/track and
 * closes the context.
 *
 * Every stream a request yields is recorded in `acquired` the moment it
 * arrives, attached or not, and `dispose()` stops all of them. A request
 * that resolves after `dispose()` (Stop pressed while the permission prompt
 * or share picker was still open) finds its run superseded and stops its
 * own tracks: that late stream is what left the mic indicator on.
 */
export class Capture {
  private ctx: AudioContext | null = null;
  private sources = new Map<Source, SourceNodes>();
  private acquired = new Set<MediaStream>();
  private acquiredHelpers = new Set<HelperSource>();
  private handler: FrameHandler;
  /** Bumped by every `start()` and `dispose()`; a run whose number is stale was stopped. */
  private run = 0;
  /** The mic's device request, kept so it can be asked again without echo cancellation. */
  private micDeviceId: string | undefined;
  /** The live mic track was requested with echo cancellation on. */
  private micCancelsEcho = false;
  /** Silent share frames seen so far, or `null` once the watch is over. */
  private shareSilentFrames: number | null = null;
  private shareFlaggedSilent = false;
  private mode: 'mic' | 'system' | 'both' | null = null;
  private displaySurface: string | null = null;
  private shareError: string | null = null;
  private callAudioUnsupported = false;
  private systemVia: 'share' | 'helper' | null = null;
  private micReopens = 0;
  /** Zero frames from the mic since the session started, or `null` once it
   *  delivered sound or was reported (`SILENT_MIC_FRAMES`). */
  private micZeroFrames: number | null = 0;
  /** Non-blocking guidance for browser-specific capture limitations. */
  warning: string | null = null;

  constructor(handler: FrameHandler) {
    this.handler = handler;
  }

  get activeSources(): Source[] {
    return [...this.sources.keys()];
  }

  /**
   * Start browser capture. "System" audio is a `getDisplayMedia`
   * tab/screen share, or the native system audio helper when it runs
   * (`helper-source.ts`): Safari always tries the helper, since its shares
   * carry no audio; other browsers use it only when a probe has already
   * found it, because their share request must be made before any await.
   * (The `SystemVia` setting a caller may pass through `StartOpts` is not
   * read here.)
   *
   * When `mode` is `both`, a failed system source (the user declined the
   * share picker, the browser returned a share without audio — some Safari
   * versions — or the shared surface had no audio track) is silent: the mic keeps
   * recording and `activeSources` simply won't include `'system'`. There is
   * deliberately no warning returned for this — callers that want to tell
   * the user check `activeSources` themselves (see `BottomDock`'s "call
   * audio not included" indicator) rather than interrupt them with a toast
   * for something this common and non-fatal. `mode === 'system'` (no mic to
   * fall back to) still throws on the same failure.
   *
   * A `dispose()` while this is still awaiting makes it resolve with no
   * sources attached and every acquired track stopped.
   */
  async start(mode: 'mic' | 'system' | 'both', micDeviceId?: string): Promise<void> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      throw new Error('Audio capture is only available in the browser');
    }
    const run = ++this.run;
    const aborted = (): boolean => run !== this.run;
    this.micDeviceId = micDeviceId;
    this.micCancelsEcho = false;
    this.shareSilentFrames = null;
    this.shareFlaggedSilent = false;
    this.mode = mode;
    this.displaySurface = null;
    this.shareError = null;
    this.micReopens = 0;
    this.micZeroFrames = 0;
    this.callAudioUnsupported = false;
    this.systemVia = null;
    this.warning = null;
    const wantMic = mode === 'mic' || mode === 'both';
    const wantSystem = mode === 'system' || mode === 'both';
    // Safari's getDisplayMedia never carries audio, so a share picker would
    // only show a pointless prompt and a "sharing" indicator: Safari asks the
    // helper, which in Both mode also records the mic. Safari never calls
    // getUserMedia: in Mic mode the helper streams the mic alone, and with
    // no helper Safari fails rather than open the mic itself.
    const safari = isSafariEngine();
    const viaHelper = wantSystem && (safari || helperKnownReachable());
    const Ctx = window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio is not supported in this browser');
    // Created before any media request: a share request consumes the click's
    // user activation, and a context created after it can start suspended in
    // Safari, which then delivers no frames and no levels.
    const ctx = new Ctx();
    this.ctx = ctx;
    // getDisplayMedia BEFORE any await: it needs the click's transient user
    // activation, which is consumed by the first awaited task.
    const label = (what: string) => (err: unknown): never => {
      const msg = err instanceof Error ? err.message || err.name : String(err);
      throw new Error(`${what}: ${msg}`);
    };
    const systemP: Promise<SystemInput> | null = !wantSystem
      ? null
      : viaHelper
        ? // WebKit can take over another call's mic/camera when this page
          // opens getUserMedia, so Safari's Both mode never does: the helper
          // mixes the default input device into its frames instead.
          this.keepHelper(run, connectHelper({ mic: safari && mode === 'both' })).catch((err: unknown) => {
            if (!safari || aborted()) return label('Call audio')(err);
            this.callAudioUnsupported = mode === 'both';
            const why = err instanceof Error ? err.message : String(err);
            throw new Error(
              `Safari does not share call audio with web pages, and the system audio helper did not answer (${why}). Meeting Noter did not open your microphone to avoid interrupting another call; start the helper (npm run helper) to record the call audio and your microphone through it.`,
            );
          })
        : this.keep(run, this.systemStream()).catch(label('Call audio'));
    // Learn whether the helper runs, for the next session to use it.
    if (wantSystem && !viaHelper) void probeHelper();
    // The mic waits for the share to settle, so its one getUserMedia call is
    // made with the final echo-cancellation setting. Reconfiguring the live
    // track afterwards made the browser ask for the microphone a second time.
    // getUserMedia needs no user activation, so asking after the await is safe.
    const requestMic = (callAttached: boolean): Promise<MediaStream> => {
      this.micCancelsEcho = callAttached && !isSafariEngine();
      return this.keep(run, this.micStream(micDeviceId, this.micCancelsEcho));
    };
    // Safari's Mic mode: the helper streams the mic alone. A helper that
    // answers but cannot record the mic fails too, since nothing would be
    // recorded at all.
    const safariMic = (): Promise<HelperSource> =>
      this.keepHelper(run, connectHelper({ mic: true, system: false })).then(
        (helper) => {
          if (helperMicUsable(helper.mic)) return helper;
          throw new Error(safariMicWarning(helper.mic, true));
        },
        (err: unknown) => {
          if (aborted() || helperKnownReachable()) return label('Microphone')(err);
          throw new Error(SAFARI_MIC_NEEDS_HELPER);
        },
      );
    const micP: Promise<MediaStream | HelperSource> | null = !wantMic
      ? null
      : safari
        ? mode === 'mic' ? safariMic() : null
        : (systemP
          ? systemP.then(
              () => true,
              () => false,
            ).then((attached) => {
              if (aborted()) throw new Error('capture stopped');
              return requestMic(attached);
            })
          : requestMic(false)
        ).catch(label('Microphone'));
    try {
      const [micR, sysR] = await Promise.allSettled([
        micP ?? Promise.resolve(null),
        systemP ?? Promise.resolve(null),
      ]);
      if (aborted()) return;
      // Mic failure is fatal even in "both" mode.
      if (micR.status === 'rejected') throw micR.reason;
      const mic = micR.value;
      let system: SystemInput | null = null;
      if (sysR.status === 'fulfilled') {
        system = sysR.value;
      } else if (mode === 'both' && mic) {
        // Call audio is optional in "both" mode — degrade silently to
        // mic-only (see the method doc comment above for why).
        this.shareError = sysR.reason instanceof Error ? sysR.reason.message : String(sysR.reason);
      } else {
        if (mode === 'both') {
          this.shareError = sysR.reason instanceof Error ? sysR.reason.message : String(sysR.reason);
        }
        throw sysR.reason;
      }
      try {
        await ctx.audioWorklet.addModule('/worklets/pcm16.js');
      } catch (err) {
        throw new Error(`Failed to load audio worklet: ${err instanceof Error ? err.message : String(err)}`);
      }
      // Resume in case the context starts suspended (autoplay policy).
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // Non-fatal; nodes still run once the context resumes.
        }
      }
      if (aborted()) return;
      if (mic && isStream(mic)) {
        this.attachSource(ctx, 'mic', mic);
      } else if (mic) {
        this.attachHelper(mic, 'mic');
        this.warning = safariMicWarning(mic.mic, true);
      }
      if (system) {
        if (isStream(system)) {
          this.attachSource(ctx, 'system', system);
          this.systemVia = 'share';
        } else {
          this.attachHelper(system, 'system');
          this.systemVia = 'helper';
          if (system.mic) this.warning = safariMicWarning(system.mic);
        }
        // Always watched: silence must reach the UI even where the mic
        // keeps echo cancellation off (Safari) and has nothing to swap.
        this.shareSilentFrames = 0;
      }
    } catch (err) {
      // A request still pending when an early step threw settles later; its
      // rejection is expected, not unhandled.
      micP?.catch(() => {});
      systemP?.catch(() => {});
      // Stops every stream acquired so far; one still pending stops itself
      // on arrival, since this bumps the run.
      if (!aborted()) await this.dispose();
      throw err;
    }
  }

  /** `keep` for a helper connection. */
  private async keepHelper(run: number, request: Promise<HelperSource>): Promise<HelperSource> {
    const helper = await request;
    if (run !== this.run) {
      helper.close();
      throw new Error('capture stopped');
    }
    this.acquiredHelpers.add(helper);
    return helper;
  }

  /** Record a requested stream, or stop it when its run was disposed meanwhile. */
  private async keep(run: number, request: Promise<MediaStream>): Promise<MediaStream> {
    const stream = await request;
    if (run !== this.run) {
      stopTracks(stream);
      throw new Error('capture stopped');
    }
    this.acquired.add(stream);
    return stream;
  }

  /**
   * The session's one microphone request. `callAttached` sets echo
   * cancellation, which subtracts what the speakers play: on when call audio
   * is captured as its own source, so the far side is heard once; off
   * otherwise (`mode: 'mic'`, a declined share, a share without audio), where
   * the mic is the only way a meeting playing on this machine reaches the
   * transcript. Safari keeps it off even with a share attached, since which
   * Safari shares actually carry sound varies. It is never changed on the
   * live track; a share that turns out silent gets a new mic track instead
   * (see `watchShare`).
   *
   * In "both" mode gain control is pinned off. Chrome's default ties it to
   * echo cancellation, so the mic with a share attached ran an analog AGC
   * that raises the macOS input volume, and the track that replaced it
   * without echo cancellation kept that raised volume with nothing to rein
   * it in: the mic got much louder mid-session, and stayed louder after.
   * Pinned, a session's two mic requests differ only in echo cancellation.
   * "mic" mode keeps its request as it was.
   */
  private async micStream(micDeviceId: string | undefined, callAttached: boolean): Promise<MediaStream> {
    const audio: MediaTrackConstraints = { echoCancellation: callAttached, noiseSuppression: true };
    if (this.mode === 'both') audio.autoGainControl = false;
    if (micDeviceId) audio.deviceId = { ideal: micDeviceId }; // ideal: a stale saved id falls back to default
    return navigator.mediaDevices.getUserMedia({ audio, video: false });
  }

  private async systemStream(): Promise<MediaStream> {
    // Safari is asked too: which Safari versions hand back an audio track for
    // a shared tab or screen varies, so the share is attempted and the "no
    // audio track" check below decides. The Safari mic keeps echo
    // cancellation off (see `micStream`), so a share that comes back silent
    // still leaves the meeting audible via the mic.
    // Chrome/Edge: user picks the call tab or entire screen; then we drop video.
    // Audio itself stays a plain boolean: nested constraints there throw
    // "Invalid constraint" in some browsers. `systemAudio: 'include'` and the
    // `displaySurface` hint are Chrome/Edge-only, non-standard extensions to
    // getDisplayMedia (not in TS's DOM lib, hence the cast) — a browser that
    // doesn't recognize a key just ignores it.
    //
    // `systemAudio: 'include'` asks Chrome to offer system audio with an
    // entire screen, `windowAudio: 'system'` (Chrome 141+) to offer it with
    // a shared window too, so a desktop app (Teams/Zoom) shared as its own
    // window carries the call; `displaySurface: 'monitor'` pre-selects
    // "Entire screen". None of them restricts what the user can pick.
    const constraints = {
      video: { displaySurface: 'monitor' },
      audio: true,
      systemAudio: 'include',
      windowAudio: 'system',
      monitorTypeSurfaces: 'include',
      surfaceSwitching: 'include',
    } as DisplayMediaStreamOptions;
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const surface = (stream.getVideoTracks()[0]?.getSettings?.() as { displaySurface?: string } | undefined)
      ?.displaySurface;
    this.displaySurface = surface ?? null;
    for (const track of stream.getVideoTracks()) {
      try {
        track.stop();
      } catch {
        // Ignore; track may already be stopped.
      }
      stream.removeTrack(track);
    }
    if (stream.getAudioTracks().length === 0) {
      stopTracks(stream);
      throw new Error('No system audio track — share a tab with audio or the entire screen');
    }
    // The share is the far side itself, not a mic: echo cancellation would
    // subtract the very playback it carries, and gain control and noise
    // suppression pump its level. Set on the live track, since nested audio
    // constraints in the request throw in some browsers; one that cannot be
    // reconfigured still records.
    for (const track of stream.getAudioTracks()) {
      try {
        await track.applyConstraints?.({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
      } catch {
        // Keep the browser's defaults.
      }
    }
    return stream;
  }

  /**
   * The mic cancels what the speakers play only because the share is meant
   * to carry that audio. A share with an audio track can still be silent:
   * the meeting plays in another tab or a desktop app, the browser leaves
   * its own playback out of a screen share, or "share audio" was off. Then
   * the mic's echo cancellation removes the only copy of the far side, and
   * it is transcribed only when the speakers are loud enough to leak past
   * it. So a share that stays silent for `SILENT_SHARE_FRAMES` gets the mic
   * asked again without echo cancellation; the share stays attached in case
   * it comes alive.
   */
  private watchShare(rms: number): void {
    if (this.shareSilentFrames === null) {
      if (this.shareFlaggedSilent && rms >= SHARE_SOUND_RMS) {
        this.shareFlaggedSilent = false;
        this.handler.onCallAudioSilent?.(false);
      }
      return;
    }
    if (rms >= SHARE_SOUND_RMS) {
      this.shareSilentFrames = null;
      return;
    }
    this.shareSilentFrames += 1;
    if (this.shareSilentFrames < SILENT_SHARE_FRAMES) return;
    this.shareSilentFrames = null;
    if (this.sources.has('mic') && this.micCancelsEcho) {
      void this.hearSpeakersViaMic();
    } else {
      this.shareFlaggedSilent = true;
      this.handler.onCallAudioSilent?.(true);
    }
  }

  /**
   * A mic track can be live and unmuted yet deliver exact zeros (a muted
   * input, the OS withholding the Microphone permission): frames flow, the
   * transcript just never gets the user's voice. Reported once per session.
   * One frame of sound ends the watch: Chrome's noise suppression and echo
   * cancellation gate a working mic to exact zero while the user is quiet.
   */
  private watchMic(rms: number): void {
    if (this.micZeroFrames === null) return;
    if (rms !== 0) {
      this.micZeroFrames = null;
      return;
    }
    this.micZeroFrames += 1;
    if (this.micZeroFrames < SILENT_MIC_FRAMES) return;
    this.micZeroFrames = null;
    console.warn('[capture] The mic delivers only digital silence');
    this.handler.onWarning?.(SILENT_MIC_WARNING);
  }

  /** Swap the live mic for one without echo cancellation. */
  private async hearSpeakersViaMic(): Promise<void> {
    const run = this.run;
    const ctx = this.ctx;
    if (!ctx || !this.sources.has('mic')) return;
    let stream: MediaStream;
    try {
      stream = await this.keep(run, this.micStream(this.micDeviceId, false));
    } catch (err) {
      if (run === this.run) console.warn('[capture] Could not reopen the mic without echo cancellation', err);
      return;
    }
    if (!this.sources.has('mic')) {
      // The mic ended meanwhile; this session no longer records one.
      this.acquired.delete(stream);
      stopTracks(stream);
      return;
    }
    this.dropSource('mic');
    this.attachSource(ctx, 'mic', stream);
    this.micCancelsEcho = false;
    this.micReopens += 1;
    this.shareFlaggedSilent = true;
    console.info('[capture] Shared call audio is silent; the mic now hears the speakers');
    this.handler.onCallAudioSilent?.(true);
  }

  /**
   * Helper frames are already 16 kHz Int16 frames: they skip the worklet.
   * As `system` they carry the call audio (with the mic mixed in, in
   * Safari's Both mode); as `mic`, the mic alone. The helper reports its own
   * mic going silent, so `mic` frames are not run through `watchMic`.
   */
  private attachHelper(helper: HelperSource, source: Source): void {
    const stats = newStats();
    const ended = (): void => {
      const current = this.sources.get(source);
      if (current?.kind === 'helper' && current.helper === helper) this.handler.onSourceEnded(source);
    };
    helper.onFrame = (pcm, rms) => {
      countFrame(stats, rms);
      this.handler.onLevel(source, rms);
      this.handler.onFrame(source, pcm);
      if (source === 'system') this.watchShare(rms);
    };
    helper.onEnded = ended;
    // Kept current for a later readout; a mic that stops recording the user
    // (silent, denied, unplugged) is reported at once, not at the next start.
    helper.onMicChange = (mic) => {
      this.warning = safariMicWarning(mic, source === 'mic');
      console.info(`[capture] Helper mic is now ${mic.state}${mic.error ? `: ${mic.error}` : ''}`);
      if (!helperMicUsable(mic)) this.handler.onWarning?.(this.warning);
    };
    this.sources.set(source, { kind: 'helper', helper, stats });
    // It may have dropped between connecting and attaching.
    if (!helper.live) queueMicrotask(ended);
  }

  private attachSource(ctx: AudioContext, source: Source, stream: MediaStream): void {
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
      this.handler.onLevel(source, rms);
      this.handler.onFrame(source, data.pcm);
      if (source === 'system') this.watchShare(rms);
      else this.watchMic(rms);
    };
    node.port.onmessage = onMessage;
    ctxSource.connect(node);
    // Not connected to destination: we capture without playback.
    this.sources.set(source, { kind: 'stream', stream, ctxSource, node, onMessage, stats });
    // Only the stream currently attached ends its source: a mic replaced by
    // `hearSpeakersViaMic` may still report `ended` once its device restarts,
    // and must not take the mic that replaced it down with it.
    for (const track of stream.getTracks()) {
      track.onended = () => {
        const current = this.sources.get(source);
        if (current?.kind === 'stream' && current.stream === stream) this.handler.onSourceEnded(source);
      };
    }
  }

  /** A snapshot of what each source is delivering, for the dev readout. */
  diagnostics(): CaptureDiagnostics {
    const sources: Partial<Record<Source, SourceReadout>> = {};
    for (const [source, entry] of this.sources) {
      const { stats } = entry;
      sources[source] = {
        tracks: entry.kind === 'helper' ? [helperReadout(entry.helper, source)] : entry.stream.getAudioTracks().map(trackReadout),
        frames: stats.frames,
        zeroFrames: stats.zeroFrames,
        soundFrames: stats.soundFrames,
        rms: stats.rms,
        peakRms: stats.peakRms,
      };
    }
    return {
      mode: this.mode,
      contextState: this.ctx?.state ?? null,
      contextSampleRate: this.ctx?.sampleRate ?? null,
      displaySurface: this.displaySurface,
      shareError: this.shareError,
      callAudioUnsupported: this.callAudioUnsupported,
      systemVia: this.systemVia,
      micCancelsEcho: this.micCancelsEcho,
      micReopens: this.micReopens,
      shareSilent: this.shareFlaggedSilent,
      sources,
    };
  }

  /** Drop one source (nodes + tracks) but keep the context for the rest. */
  dropSource(source: Source): void {
    const entry = this.sources.get(source);
    if (!entry) return;
    this.sources.delete(source);
    if (entry.kind === 'helper') {
      this.acquiredHelpers.delete(entry.helper);
      entry.helper.close();
      return;
    }
    this.acquired.delete(entry.stream);
    try {
      entry.node.port.onmessage = null;
      entry.node.port.close();
      entry.node.disconnect();
      entry.ctxSource.disconnect();
    } catch {
      // Ignore teardown errors.
    }
    stopTracks(entry.stream);
  }

  async suspend(): Promise<void> {
    try {
      await this.ctx?.suspend();
    } catch {
      // Ignore; capture continues and frames are dropped while paused.
    }
  }

  async resume(): Promise<void> {
    try {
      await this.ctx?.resume();
    } catch {
      // Ignore; will recover on next user gesture.
    }
  }

  /**
   * Stop every acquired track and close the context. Safe to call twice.
   * The tracks stop synchronously, before the first await, so a caller that
   * cannot wait (pagehide) still releases the microphone.
   */
  async dispose(): Promise<void> {
    this.run++;
    this.shareSilentFrames = null;
    for (const source of [...this.sources.keys()]) this.dropSource(source);
    for (const stream of this.acquired) stopTracks(stream);
    this.acquired.clear();
    for (const helper of this.acquiredHelpers) helper.close();
    this.acquiredHelpers.clear();
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        // Ignore close errors on an already-closed context.
      }
    }
  }
}
