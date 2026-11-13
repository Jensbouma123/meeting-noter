export type Source = 'mic' | 'system';
export type CaptureMode = 'mic' | 'system' | 'both';
export type SystemVia = 'native' | 'browser';

export type Status =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'live'
  | 'paused'
  | 'stopping'
  | 'error';

export interface Levels {
  mic: number;
  system: number;
}

export interface StartOpts {
  mode: CaptureMode;
  micDeviceId?: string;
  language?: string;
  systemVia?: SystemVia;
}

export interface Stats {
  rtf: number;
  lagMs: number;
  rssMb: number;
}

export interface LanguageInfo {
  code: string;
  name: string;
  locked: boolean;
  confidence: number;
}
