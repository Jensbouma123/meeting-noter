import { redactContext } from "./redact.js";
const LEVEL_RANK = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const LEVEL_TAG = {
    debug: "[DEBUG]",
    info: "[INFO]",
    warn: "[WARN]",
    error: "[ERROR]",
};
/** Console method for a given level. Shared with `a11y-logger`'s default sink. */
export function consoleMethodForLevel(level) {
    switch (level) {
        case "error":
            return console.error.bind(console);
        case "warn":
            return console.warn.bind(console);
        case "info":
            return console.info.bind(console);
        default:
            return console.debug.bind(console);
    }
}
const consoleSink = (level, message, context) => {
    const method = consoleMethodForLevel(level);
    if (context !== undefined)
        method(message, context);
    else
        method(message);
};
let minLevel = "debug";
let sink = consoleSink;
/**
 * The debug/info dev-only gate. Every debug/info call short-circuits on this so a
 * production bundle pays nothing but a dead branch the minifier drops.
 */
export function isDevLoggingEnabled() {
    return process.env.NODE_ENV !== "production";
}
/** Sets the minimum level emitted, across all scopes. Default is `"debug"`. */
export function setLogLevel(level) {
    minLevel = level;
}
/** Swaps the sink every scope emits through. Pass `null` to restore the console default. */
export function setLogSink(next) {
    sink = next ?? consoleSink;
}
function isLevelEnabled(level) {
    return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}
function emit(level, scope, message, context) {
    if (!isLevelEnabled(level))
        return;
    const line = `${LEVEL_TAG[level]} ${scope} - ${message}`;
    sink(level, line, context && redactContext(context));
}
/**
 * Creates a logger bound to a compile-time-constant `scope` (e.g. `"DataTable/useSort"`),
 * so log lines carry an explicit file/module + function origin instead of a parsed stack.
 */
export function createLogger(scope) {
    return {
        debug(message, context) {
            if (!isDevLoggingEnabled())
                return;
            emit("debug", scope, message, context);
        },
        info(message, context) {
            if (!isDevLoggingEnabled())
                return;
            emit("info", scope, message, context);
        },
        warn(message, context) {
            emit("warn", scope, message, context);
        },
        error(message, context) {
            emit("error", scope, message, context);
        },
        child(subscope) {
            return createLogger(`${scope}/${subscope}`);
        },
    };
}
