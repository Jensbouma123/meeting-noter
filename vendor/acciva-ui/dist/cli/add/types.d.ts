export interface CommandResult {
    readonly exitCode: 0 | 1;
    readonly stdout: string;
    readonly stderr: string;
}
export interface AddReport {
    readonly components: readonly string[];
    readonly added: readonly string[];
    readonly skipped: readonly string[];
    readonly files: readonly {
        readonly from: string;
        readonly to: string;
    }[];
    readonly peerDependencies: Readonly<Record<string, string>>;
    readonly devDependencies: Readonly<Record<string, string>>;
    readonly notes: readonly string[];
    readonly errors: readonly string[];
    readonly dryRun: boolean;
}
