import type { Registry, RegistryComponent } from "./types.js";
export declare function findComponent(registry: Registry, name: string): RegistryComponent | undefined;
/** Closest component name, or undefined when nothing is near enough to be a typo. */
export declare function suggestComponent(registry: Registry, name: string): string | undefined;
