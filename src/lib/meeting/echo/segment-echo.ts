import type { EchoConfig } from '../types/echo-config';
import type { EchoVerdict } from '../types/echo-verdict';
import { DEFAULT_ECHO_CONFIG } from './echo-defaults';
import { classifyEcho } from './echo-classify';
import { measureEcho } from './echo-measure';
import { echoFrames, secondsToEchoFrame } from './echo-store';

const HISTORY_FRAMES = 1000;

export function micEchoVerdict(start: number, end: number, cfg: EchoConfig = DEFAULT_ECHO_CONFIG): EchoVerdict | undefined {
  const w0 = secondsToEchoFrame(start);
  const w1 = secondsToEchoFrame(end);
  const from = w0 - cfg.marginFrames - cfg.maxLagFrames - HISTORY_FRAMES;
  const to = w1 + cfg.marginFrames;
  const mic = echoFrames('mic', from, to);
  const system = echoFrames('system', from, to);
  if (!mic || !system) return undefined;
  return classifyEcho(measureEcho(mic, system, w0, w1, cfg), cfg);
}
