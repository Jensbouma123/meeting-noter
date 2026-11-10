export declare class CliError extends Error {
    readonly exitCode: 1;
}
/** Thrown for `<command> --help`: print the text to stdout and exit 0. */
export declare class CliHelp extends Error {
}
