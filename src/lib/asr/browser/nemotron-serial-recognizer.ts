import type { BiaserSlot } from '@/lib/vocabulary/biaser-slot';
import { nemotronLangId } from './nemotron-constants';
import type { NemotronRecognizer } from './nemotron-recognizer';
import type { SerialQueue } from './serial-queue';
import type { NemotronResult } from './types';

export class NemotronSerialRecognizer {
  private languageHint: string | null = null;

  constructor(
    private readonly queue: SerialQueue,
    private readonly vocabulary: BiaserSlot,
  ) {}

  setLanguageHint(code: string | null): void {
    this.languageHint = code;
  }

  run(recognizer: NemotronRecognizer, audio: Float32Array): Promise<NemotronResult> {
    return this.queue.run(() =>
      recognizer.recognize(audio, {
        langId: nemotronLangId(this.languageHint ?? 'auto'),
        biaser: this.vocabulary.get(),
      }),
    );
  }
}
