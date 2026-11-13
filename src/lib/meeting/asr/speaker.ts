import type { SpeakerLabeler, SpeakerTimeline } from '../types/asr-speaker';
import { asrState, singleSpeakerLabel } from './state';

export function setSpeakerLabeler(labeler: SpeakerLabeler | null): void {
  asrState.speakerLabeler = labeler ?? singleSpeakerLabel;
}

export function setSpeakerTimeline(timeline: SpeakerTimeline | null): void {
  asrState.speakerTimeline = timeline;
}
