import { downloadHfFileResumable } from '@/lib/asr/browser/resumable-download';
import { modelSource, revokeModelUrls } from '@/lib/diarization/browser/downloader';
import { Tensor, createSession, type InferenceSession } from '@/lib/diarization/browser/onnx-session';
import { MOSSFORMER2_MODEL, SEPARATOR_INPUT, SEPARATOR_OUTPUT } from './manifest';
import { padMix, splitSources } from './mossformer2-io';
import type { LoadedSeparator } from './types/model';

let loading: Promise<LoadedSeparator> | null = null;

async function load(): Promise<LoadedSeparator> {
  const { repo, filename, revision, url: urlOverride } = MOSSFORMER2_MODEL;
  const url = await downloadHfFileResumable(repo, filename, revision, { urlOverride });
  try {
    const created = await createSession(modelSource(url));
    if (created.backend === 'webgpu') return { session: created.session, backend: 'webgpu' };
    await created.session.release();
    return { session: null, backend: 'wasm' };
  } finally {
    revokeModelUrls({ [filename]: url });
  }
}

export function loadSeparatorModel(): Promise<LoadedSeparator> {
  loading ??= load().catch((err: unknown) => {
    loading = null;
    throw err;
  });
  return loading;
}

export async function runSeparator(session: InferenceSession, mix: Float32Array): Promise<[Float32Array, Float32Array]> {
  const input = padMix(mix);
  const out = await session.run({ [SEPARATOR_INPUT]: new Tensor('float32', input, [1, input.length]) });
  const sources = out[SEPARATOR_OUTPUT];
  try {
    return splitSources(sources.data as Float32Array, mix);
  } finally {
    sources.dispose();
  }
}
