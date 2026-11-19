import { BandEnvelope } from '@/lib/meeting/echo/band-envelope';
import { measureEcho } from '@/lib/meeting/echo/echo-measure';
import { secondsToEchoFrame } from '@/lib/meeting/echo/echo-store';
import { int16ToFloat32 } from '@/lib/meeting/pcm';
import { toFrames } from '@/lib/meeting/two-source-bleed.testSupport';
import type { EchoConfig } from '@/lib/meeting/types/echo-config';
import type { EchoFrames } from '@/lib/meeting/types/echo-frames';
import type { CaseResult } from '../types/case-result';
import type { MeasuredCase } from '../types/measured-case';
import type { RenderedCase } from '../types/rendered-case';

function envelopeOf(pcm: Float32Array): EchoFrames {
  const env = new BandEnvelope();
  for (const frame of toFrames(pcm)) env.push(int16ToFloat32(frame));
  return env.frames(0, Number.MAX_SAFE_INTEGER)!;
}

export function measureFeatures(c: MeasuredCase, cfg: EchoConfig): MeasuredCase {
  const features = c.result.micAsr.map((s) =>
    measureEcho(c.mic, c.system, secondsToEchoFrame(s.start), secondsToEchoFrame(s.end), cfg),
  );
  return { ...c, features };
}

export function measureCase(result: CaseResult, audio: RenderedCase, cfg: EchoConfig): MeasuredCase {
  return measureFeatures({ result, mic: envelopeOf(audio.mic), system: envelopeOf(audio.system), features: [] }, cfg);
}
