import type { ModelProgressView } from './modelReadiness.types';

export const NO_MODEL_PROGRESS: ModelProgressView = Object.freeze({
  stage: null,
  percent: null,
  label: '',
  detail: null,
});
