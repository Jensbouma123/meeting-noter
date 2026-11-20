export const SEPARATOR_STRIDE = 2048;
export const SEPARATOR_EDGE = 8;

export function validLength(n: number): number {
  return SEPARATOR_STRIDE * Math.ceil(Math.max(0, n - SEPARATOR_EDGE) / SEPARATOR_STRIDE) + SEPARATOR_EDGE;
}

export function padMix(mix: Float32Array): Float32Array {
  const padded = new Float32Array(validLength(mix.length));
  padded.set(mix);
  return padded;
}

export function fitToMix(track: Float32Array, mix: Float32Array): Float32Array {
  let num = 0;
  let den = 1e-9;
  for (let i = 0; i < track.length; i += 1) {
    num += track[i] * mix[i];
    den += track[i] * track[i];
  }
  const gain = num / den;
  return track.map((v) => v * gain);
}

export function splitSources(sources: Float32Array, mix: Float32Array): [Float32Array, Float32Array] {
  const padded = sources.length / 2;
  const a = sources.slice(0, mix.length);
  const b = sources.slice(padded, padded + mix.length);
  return [fitToMix(a, mix), fitToMix(b, mix)];
}
