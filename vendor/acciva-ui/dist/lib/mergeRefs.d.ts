import type { Ref, RefCallback } from "react";
/** Combines refs (callback or object, either may be absent) into one callback ref. */
export declare function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T>;
