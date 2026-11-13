import { SHARE_SOUND_RMS, SILENT_MIC_FRAMES, SILENT_MIC_WARNING, SILENT_SHARE_FRAMES } from './capture-constants';
import type { ShareSilenceHooks } from './types/share-silence-hooks';

export class MicSilenceWatch {
  private zeroFrames: number | null = 0;

  constructor(private readonly onSilent: (warning: string) => void) {}

  reset(): void {
    this.zeroFrames = 0;
  }

  feed(rms: number): void {
    if (this.zeroFrames === null) return;
    if (rms !== 0) {
      this.zeroFrames = null;
      return;
    }
    this.zeroFrames += 1;
    if (this.zeroFrames < SILENT_MIC_FRAMES) return;
    this.zeroFrames = null;
    console.warn('[capture] The mic delivers only digital silence');
    this.onSilent(SILENT_MIC_WARNING);
  }
}

export class ShareSilenceWatch {
  private silentFrames: number | null = null;
  flaggedSilent = false;

  constructor(private readonly hooks: ShareSilenceHooks) {}

  reset(): void {
    this.silentFrames = null;
    this.flaggedSilent = false;
  }

  arm(): void {
    this.silentFrames = 0;
  }

  disarm(): void {
    this.silentFrames = null;
  }

  feed(rms: number): void {
    if (this.silentFrames === null) {
      if (this.flaggedSilent && rms >= SHARE_SOUND_RMS) {
        this.flaggedSilent = false;
        this.hooks.onCallAudioSilent(false);
      }
      return;
    }
    if (rms >= SHARE_SOUND_RMS) {
      this.silentFrames = null;
      return;
    }
    this.silentFrames += 1;
    if (this.silentFrames < SILENT_SHARE_FRAMES) return;
    this.silentFrames = null;
    if (this.hooks.canSwapMic()) {
      this.hooks.swapMic();
    } else {
      this.flaggedSilent = true;
      this.hooks.onCallAudioSilent(true);
    }
  }
}
