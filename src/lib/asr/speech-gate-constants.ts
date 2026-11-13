export const SPEECH_GATE_SAMPLE_RATE = 16_000;

const SR = SPEECH_GATE_SAMPLE_RATE;
const DECIMATED_RATE_DIVISOR = 2;

export const ANALYSIS_FRAME_SAMPLES = 480;
export const DECIMATE = DECIMATED_RATE_DIVISOR;
export const MIN_PITCH_LAG = Math.round(SR / DECIMATE / 400);
export const MAX_PITCH_LAG = Math.round(SR / DECIMATE / 80);
export const LOWPASS_COEFFICIENT = 1 - Math.exp((-2 * Math.PI * 1000) / SR);
export const FLOOR_RISE_PER_SECOND = 1.015;
export const STEADY_BLOCKS = 3;
