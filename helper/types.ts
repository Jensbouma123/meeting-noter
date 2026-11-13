export interface SegmentLevels {
  segment: string;
  call: number;
  mic: number;
  peak: number;
}

export type MixerReport = Record<'speakers' | 'headphones' | 'headset' | 'alone', SegmentLevels[]>;

export interface DownsamplerReport {
  gains: Record<string, number>;
  mix: number[];
}
