export interface FakeTrack {
  kind: 'audio' | 'video';
  stop: () => void;
  onended: (() => void) | null;
}
