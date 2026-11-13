import type { HelperSource } from '../helper-source';
import type { CaptureMode, Source } from './basics';

export interface FrameHandler {
  onFrame(source: Source, pcm: ArrayBuffer): void;
  onLevel(source: Source, rms: number): void;
  onSourceEnded(source: Source): void;
  onCallAudioSilent?(silent: boolean): void;
  onWarning?(warning: string): void;
}

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

export interface SourceReadout {
  tracks: TrackReadout[];
  frames: number;
  zeroFrames: number;
  soundFrames: number;
  rms: number;
  peakRms: number;
}

export interface CaptureDiagnostics {
  mode: CaptureMode | null;
  contextState: string | null;
  contextSampleRate: number | null;
  displaySurface: string | null;
  shareError: string | null;
  callAudioUnsupported: boolean;
  systemVia?: 'share' | 'helper' | null;
  micCancelsEcho: boolean;
  micReopens: number;
  shareSilent: boolean;
  sources: Partial<Record<Source, SourceReadout>>;
}

export interface SourceStats {
  frames: number;
  zeroFrames: number;
  soundFrames: number;
  rms: number;
  peakRms: number;
  peakWindow: number;
}

export interface StreamNodes {
  kind: 'stream';
  stream: MediaStream;
  ctxSource: MediaStreamAudioSourceNode;
  node: AudioWorkletNode;
  onMessage: (ev: MessageEvent) => void;
  stats: SourceStats;
}

export interface HelperNodes {
  kind: 'helper';
  helper: HelperSource;
  stats: SourceStats;
}

export type SourceNodes = StreamNodes | HelperNodes;

export type SystemInput = MediaStream | HelperSource;
