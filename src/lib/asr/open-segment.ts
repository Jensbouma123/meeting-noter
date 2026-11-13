import { isNoiseText } from './noise-text';
import type { LiveChunkerConfig, LiveSegmentUpdate, TimelineWord } from './types';
import { hasSpeech } from './word-text';

export class OpenSegment {
  id: string | null = null;
  words: TimelineWord[] = [];
  hyp: TimelineWord[] = [];
  beforeCut: TimelineWord | null = null;
  private shownText = '';

  constructor(
    private readonly newId: () => string,
    private readonly cfg: LiveChunkerConfig,
  ) {}

  get isOpen(): boolean {
    return this.id !== null || this.words.length > 0 || this.hyp.length > 0;
  }

  get firstWordStart(): number | undefined {
    return this.words[0]?.start ?? this.hyp[0]?.start;
  }

  show(updates: LiveSegmentUpdate[], winEnd: number): void {
    const words = [...this.words, ...this.hyp];
    const text = words.map((w) => w.text).join(' ');
    if (!hasSpeech(text) || isNoiseText(words, this.cfg)) return;
    this.id ??= this.newId();
    this.shownText = text;
    updates.push({
      id: this.id,
      text,
      startSample: words[0].start,
      endSample: Math.min(winEnd, Math.max(words[words.length - 1].end, words[0].start)),
      final: false,
      words,
    });
  }

  close(updates: LiveSegmentUpdate[], end: number, bufferStart: number): void {
    const words = [...this.words, ...this.hyp];
    const text = words.map((w) => w.text).join(' ');
    if (hasSpeech(text) && !isNoiseText(words, this.cfg)) {
      updates.push({
        id: this.id ?? this.newId(),
        text,
        startSample: words[0].start,
        endSample: Math.max(words[words.length - 1].end, words[0].start),
        final: true,
        words,
      });
    } else if (this.id !== null) {
      updates.push({ id: this.id, text: this.shownText, startSample: bufferStart, endSample: end, final: true, words: [] });
    }
    this.clear();
  }

  clear(): void {
    this.id = null;
    this.words = [];
    this.shownText = '';
    this.hyp = [];
    this.beforeCut = null;
  }
}
