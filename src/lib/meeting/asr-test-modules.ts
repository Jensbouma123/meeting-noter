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

type Loaded<T extends readonly (() => Promise<unknown>)[]> = T extends readonly [infer H, ...infer R]
  ? H extends () => Promise<infer M>
    ? M & Loaded<R extends readonly (() => Promise<unknown>)[] ? R : []>
    : never
  : unknown;

export async function importAsrModules(): Promise<Loaded<typeof ASR_MODULE_LOADERS>> {
  await import('./asr/init');
  const modules = await Promise.all(ASR_MODULE_LOADERS.map((load) => load()));
  return Object.assign({}, ...modules);
}
