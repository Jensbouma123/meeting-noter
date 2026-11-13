import { setState } from './store';

let callAudioMissing = false;
const callAudioListeners = new Set<() => void>();

export function setCallAudioMissing(value: boolean): void {
  if (callAudioMissing === value) return;
  callAudioMissing = value;
  setState({ callAudioMissing: value });
  for (const fn of callAudioListeners) fn();
}

export function getCallAudioMissing(): boolean {
  return callAudioMissing;
}

export function subscribeCallAudio(fn: () => void): () => void {
  callAudioListeners.add(fn);
  return () => {
    callAudioListeners.delete(fn);
  };
}
