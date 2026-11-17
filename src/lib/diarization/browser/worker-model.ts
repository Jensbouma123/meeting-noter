import { assertDiarizationModelsCached, downloadDiarizationModels, modelSource, revokeModelUrls } from './downloader';
import { downloadHfFileResumable } from '../../asr/browser/resumable-download';
import { SORTFORMER_GRAPH, SORTFORMER_WEIGHTS, SPEAKER_EMBEDDER, externalDataPath } from './manifest';
import { SortformerModel } from './sortformer-model';

export class NotCachedError extends Error {}

let modelPromise: Promise<SortformerModel> | null = null;

async function downloadCachedModelUrls(): Promise<Record<string, string>> {
  try {
    try {
      await assertDiarizationModelsCached();
    } catch (err) {
      throw new NotCachedError(err instanceof Error ? err.message : String(err));
    }
    return await downloadDiarizationModels();
  } catch (err) {
    modelPromise = null;
    throw err;
  }
}

async function loadModelFromCache(): Promise<SortformerModel> {
  const urls = await downloadCachedModelUrls();
  const model = new SortformerModel();
  try {
    await model.load(modelSource(urls[SORTFORMER_GRAPH.filename]), {
      path: externalDataPath(SORTFORMER_WEIGHTS),
      data: modelSource(urls[SORTFORMER_WEIGHTS.filename]),
    });
    return model;
  } catch (err) {
    model.dispose();
    modelPromise = null;
    throw err;
  } finally {
    revokeModelUrls(urls);
  }
}

export function loadModel(): Promise<SortformerModel> {
  if (!modelPromise) modelPromise = loadModelFromCache();
  return modelPromise;
}

export async function releaseModel(): Promise<void> {
  const pending = modelPromise;
  modelPromise = null;
  const model = await pending?.catch(() => null);
  model?.dispose();
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Speaker embedder fetch failed (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function loadEmbedderBytes(): Promise<Uint8Array> {
  const url = await downloadHfFileResumable(SPEAKER_EMBEDDER.repo, SPEAKER_EMBEDDER.filename, 'main');
  try {
    const source = modelSource(url);
    return typeof source === 'string' ? await fetchBytes(source) : source;
  } finally {
    revokeModelUrls({ [SPEAKER_EMBEDDER.filename]: url });
  }
}
