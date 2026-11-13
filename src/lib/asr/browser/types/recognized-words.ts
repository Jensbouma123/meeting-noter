import type { TranscribeResult } from 'parakeet.js';

export type RecognizedWords = NonNullable<TranscribeResult['words']>;
