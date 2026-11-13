import type { SpeechGateConfig } from './speech-gate-config';

export type NoiseTextConfig = Pick<SpeechGateConfig, 'minWordConfidence' | 'minLoneWordConfidence'>;
