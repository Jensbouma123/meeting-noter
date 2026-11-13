import {
  assertDiarizationModelsCached,
  downloadDiarizationModels,
  modelSource,
  revokeModelUrls,
} from './downloader';
import { SORTFORMER_GRAPH, SORTFORMER_WEIGHTS, externalDataPath } from './manifest';
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
