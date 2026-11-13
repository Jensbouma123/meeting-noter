export interface ShareSilenceHooks {
  canSwapMic(): boolean;
  swapMic(): void;
  onCallAudioSilent(silent: boolean): void;
}
