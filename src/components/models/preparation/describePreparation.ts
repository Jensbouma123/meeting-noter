import type { ModelPreparationState } from './types';

export function describePreparation(state: ModelPreparationState): string | null {
  const { engine } = state;
  if (engine.phase === 'ready') return null;
  if (engine.phase === 'downloading') {
    return `status.preparing${state.downloadPercent === null ? '' : ` ${state.downloadPercent}%`}`;
  }
  if (engine.phase === 'loading') {
    return `status.preparing${engine.percent === null ? '' : ` ${engine.percent}%`}`;
  }
  return null;
}

export function describePreparationDetail(state: ModelPreparationState): string | null {
  const { engine } = state;
  return engine.phase === 'loading' && engine.detail ? engine.detail : null;
}

export function isPreparing(state: ModelPreparationState): boolean {
  return state.engine.stage !== null;
}
