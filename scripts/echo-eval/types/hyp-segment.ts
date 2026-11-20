/** One app transcript line, in seconds; `label` is the diarization label, if any. */
export interface HypSegment {
  start: number;
  end: number;
  text: string;
  label?: string | null;
}
