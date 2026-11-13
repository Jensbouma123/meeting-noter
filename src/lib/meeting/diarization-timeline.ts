import type { SpeakerTimeline } from './types/asr-speaker';
import { changePoints, turnEnds } from './diarization-boundaries';
import { speakerFor, speakerNear } from './diarization-speaker-lookup';

export const diarizationTimeline: SpeakerTimeline = { speakerFor, speakerNear, changePoints, turnEnds };
