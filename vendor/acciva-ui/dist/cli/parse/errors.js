export class CliError extends Error {
    constructor() {
        super(...arguments);
        this.exitCode = 1;
    }
}
/** Thrown for `<command> --help`: print the text to stdout and exit 0. */
export class CliHelp extends Error {
}
