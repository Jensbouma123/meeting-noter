import { loadLangIdModel } from './model';
import type { LangIdModel, WorkerOutMessage } from './types';

let model: LangIdModel | null = null;
let modelLoading: Promise<LangIdModel> | null = null;

export async function ensureModel(id: string, post: (message: WorkerOutMessage) => void): Promise<LangIdModel> {
  if (model) return model;
  if (!modelLoading) {
    modelLoading = loadLangIdModel((loaded, total, file) => post({ type: 'progress', id, loaded, total, file }));
    modelLoading.catch(() => {
      modelLoading = null;
    });
  }
  model = await modelLoading;
  return model;
}
