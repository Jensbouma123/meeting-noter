export type ComponentKind = "ui" | "block";
export interface RegistryComponent {
    readonly name: string;
    readonly kind: ComponentKind;
    readonly description: string;
    /** Source path relative to the package's `src/`, e.g. `components/ui/Button.tsx`. */
    readonly file: string;
    /** Other PascalCase values the file exports (`CardHeader` lives in Card). */
    readonly aliases: readonly string[];
}
export interface RegistryFile {
    /** Internal files this one imports, as source paths. */
    readonly imports: readonly string[];
    /** npm packages this one imports. */
    readonly peers: readonly string[];
    /** Type-only dev packages its globals need, e.g. `@types/node` for `process.env.NODE_ENV`. */
    readonly types?: readonly string[];
}
/**
 * `dist/registry/registry.json`, written by `scripts/build-registry.ts`. The raw
 * sources sit beside it under `files/<path>`, every internal import already
 * rewritten to the canonical `@/<path without extension>` form.
 */
export interface Registry {
    readonly schema: 1;
    readonly package: string;
    readonly version: string;
    readonly peerDependencies: Readonly<Record<string, string>>;
    readonly components: readonly RegistryComponent[];
    readonly files: Readonly<Record<string, RegistryFile>>;
}
export interface Selection {
    readonly components: readonly RegistryComponent[];
    /** Every file to copy, each once, requested components first. */
    readonly files: readonly string[];
    readonly peerDependencies: Readonly<Record<string, string>>;
    /** Type packages to install with `npm install -D`; any version the project already uses will do. */
    readonly devDependencies: Readonly<Record<string, string>>;
}
