export interface EchoWindow {
  frames: number;
  lagFrames: number;
  mic: Float64Array[];
  micHistory: Float64Array[];
  system: Float64Array[];
  systemHistory: Float64Array;
}
