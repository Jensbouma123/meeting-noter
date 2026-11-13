import type { AsrBackend } from '@/lib/asr/browser';

export interface BenchControlsProps {
  backend: AsrBackend | 'auto';
  encoder: string | null;
  runs: number;
  busy: boolean;
  fileName: string | null;
  onBackendChange: (backend: AsrBackend | 'auto') => void;
  onEncoderChange: (encoder: string | null) => void;
  onRunsChange: (runs: number) => void;
  onFile: (file: File | undefined) => Promise<void>;
  onFileError: (error: unknown) => void;
  onRun: () => void;
}
