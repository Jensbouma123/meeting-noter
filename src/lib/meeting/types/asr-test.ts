export interface TimedTestWord {
  text: string;
  start: number;
  end: number;
}

export interface AsrEngineTestState {
  failLoad: boolean;
  failLoadForEncoder: string | null;
  failTranscribe: boolean;
  load: { files: number; hold: boolean };
  failLoadMessage: string;
  instances: unknown[];
  encoderQuants: (string | undefined)[];
  transcribed: { samples: number; firstSample: number; source: string; isFinal: boolean }[];
  recognized: { samples: number; firstSample: number; peak: number }[];
  words: ((seconds: number) => TimedTestWord[]) | null;
  hold: Promise<void> | null;
  loadGate: Promise<void> | null;
  transcribeWords: TimedTestWord[] | null;
}

export interface ManifestFiles {
  modelRepo: string;
  files: readonly string[];
  fileUrlOverrides?: Readonly<Record<string, string>>;
}

export interface FakeEngineEvents {
  onSegment: (seg: unknown) => void;
  onStatusChange: (status: string) => void;
  onError: (message: string) => void;
  onLoadProgress?: (progress: { stage: string; done: number; total: number }) => void;
}
