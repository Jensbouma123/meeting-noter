export type ModelProgressStage = 'downloading' | 'initializing';

export type InitStage = 'files' | 'session' | 'warmup';

export interface InitProgress {
  filesDone: number;
  filesTotal: number;
  sessionsCreated: boolean;
  warmedUp: boolean;
}
