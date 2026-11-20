import * as ort from 'onnxruntime-node';

export const SEP_MODEL =
  process.env.SEP_MODEL ??
  '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval/sep-model/mossformer2_ss_16k.onnx';

let session: Promise<ort.InferenceSession> | undefined;

const validLength = (n: number): number => 2048 * Math.ceil(Math.max(0, n - 8) / 2048) + 8;

export async function separate(mix: Float32Array): Promise<[Float32Array, Float32Array]> {
  session ??= ort.InferenceSession.create(SEP_MODEL, { intraOpNumThreads: 8 });
  const s = await session;
  const t = validLength(mix.length);
  const input = new Float32Array(t);
  input.set(mix);
  const out = await s.run({ mix: new ort.Tensor('float32', input, [1, t]) });
  const data = out.sources.data as Float32Array;
  const a = data.slice(0, mix.length);
  const b = data.slice(t, t + mix.length);
  return [fitToMix(a, mix), fitToMix(b, mix)];
}

function fitToMix(track: Float32Array, mix: Float32Array): Float32Array {
  let num = 0;
  let den = 1e-9;
  for (let i = 0; i < track.length; i += 1) {
    num += track[i] * mix[i];
    den += track[i] * track[i];
  }
  const g = num / den;
  return track.map((v) => v * g);
}
