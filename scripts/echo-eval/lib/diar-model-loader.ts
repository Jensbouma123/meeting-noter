import fs from 'node:fs';
import { externalDataPath, SORTFORMER_WEIGHTS } from '@/lib/diarization/browser/manifest';
import { SortformerModel } from '@/lib/diarization/browser/sortformer-model';
import type { SessionBackend } from '@/lib/diarization/browser/types';
import { DIAR_GRAPH_FILE, DIAR_WEIGHTS_FILE } from './diar-paths';

export const diarBackendFromEnv = (): SessionBackend => (process.env.ECHO_EVAL_DIAR_MODE === 'default' ? 'wasm' : 'webgpu');

export async function loadSortformer(backend: SessionBackend = diarBackendFromEnv()): Promise<SortformerModel> {
  const model = new SortformerModel();
  const data = new Uint8Array(fs.readFileSync(DIAR_WEIGHTS_FILE));
  await model.load(new Uint8Array(fs.readFileSync(DIAR_GRAPH_FILE)), { path: externalDataPath(SORTFORMER_WEIGHTS), data });
  model.backend = backend;
  return model;
}
