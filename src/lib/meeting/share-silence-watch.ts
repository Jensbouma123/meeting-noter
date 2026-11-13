import { SHARE_SOUND_RMS, SILENT_SHARE_FRAMES } from './capture-constants';
import type { ShareSilenceHooks } from './types/share-silence-hooks';

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
