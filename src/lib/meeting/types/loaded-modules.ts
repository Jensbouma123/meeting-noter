export type LoadedModules<T extends readonly (() => Promise<unknown>)[]> = T extends readonly [infer H, ...infer R]
  ? H extends () => Promise<infer M>
    ? M & LoadedModules<R extends readonly (() => Promise<unknown>)[] ? R : []>
    : never
  : unknown;
