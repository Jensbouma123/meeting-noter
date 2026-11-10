import type { Registry, RegistryComponent, Selection } from "./types.js";
/** Transitive internal files of `entry`, in first-visit order. */
export declare function fileClosure(registry: Registry, entry: string, seen?: Set<string>): string[];
/** Components (other than `component` itself) whose file is part of its closure. */
export declare function componentDependencies(registry: Registry, component: RegistryComponent): string[];
export declare function selectComponents(registry: Registry, components: readonly RegistryComponent[]): Selection;
