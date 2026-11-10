export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;
/**
 * `message` is already prefixed with the level tag and scope (see `createLogger`);
 * `context` has already been through `redactContext`.
 */
export type LogSink = (level: LogLevel, message: string, context?: LogContext) => void;
/** Console method for a given level. Shared with `a11y-logger`'s default sink. */
export declare function consoleMethodForLevel(level: LogLevel): (...args: unknown[]) => void;
/**
 * The debug/info dev-only gate. Every debug/info call short-circuits on this so a
 * production bundle pays nothing but a dead branch the minifier drops.
 */
export declare function isDevLoggingEnabled(): boolean;
/** Sets the minimum level emitted, across all scopes. Default is `"debug"`. */
export declare function setLogLevel(level: LogLevel): void;
/** Swaps the sink every scope emits through. Pass `null` to restore the console default. */
export declare function setLogSink(next: LogSink | null): void;
export interface Logger {
    /** Dev-only: compiled out of production builds. */
    debug(message: string, context?: LogContext): void;
    /** Dev-only: compiled out of production builds. */
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    /** Derives a nested scope, e.g. `logger.child("useSort")` on `"DataTable"` -> `"DataTable/useSort"`. */
    child(subscope: string): Logger;
}
/**
 * Creates a logger bound to a compile-time-constant `scope` (e.g. `"DataTable/useSort"`),
 * so log lines carry an explicit file/module + function origin instead of a parsed stack.
 */
export declare function createLogger(scope: string): Logger;
