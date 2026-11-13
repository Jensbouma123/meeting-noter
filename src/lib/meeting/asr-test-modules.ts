import type { LoadedModules } from './types';
const ASR_MODULE_LOADERS = [
  () => import('./asr/constants'),
  () => import('./asr/backend'),
  () => import('./asr/recording-mode'),
  () => import('./asr/post-stop-run'),
  () => import('./post-stop-progress'),
  () => import('./asr/controls'),
  () => import('./asr/phase'),
  () => import('./asr/progress-build'),
  () => import('./asr/crash-recovery'),
  () => import('./asr/listeners'),
  () => import('./asr/engine-acquire'),
  () => import('./asr/speaker'),
  () => import('./asr/low-confidence'),
  () => import('./asr/live-push'),
  () => import('./asr/live-feed'),
  () => import('./asr/live-flush'),
  () => import('./asr/try-asr'),
  () => import('./asr/reset'),
  () => import('@/lib/asr/browser'),
] as const;

export async function importAsrModules(): Promise<LoadedModules<typeof ASR_MODULE_LOADERS>> {
  await import('./asr/init');
  const modules = await Promise.all(ASR_MODULE_LOADERS.map((load) => load()));
  return Object.assign({}, ...modules);
}
