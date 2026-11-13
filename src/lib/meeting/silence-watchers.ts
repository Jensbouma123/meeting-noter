import { SILENT_MIC_FRAMES, SILENT_MIC_WARNING } from './capture-constants';

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
