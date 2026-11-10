export interface ComposedSignal {
    signal: AbortSignal;
    didTimeout: () => boolean;
    cleanup: () => void;
}
/**
 * Composes a caller-supplied signal with a client-imposed timeout into one signal,
 * without mutating or replacing the caller's own signal (React Query owns that one).
 */
export declare function composeAbortSignals(callerSignal: AbortSignal | undefined, timeoutMs: number | undefined): ComposedSignal;
export declare function isAbortError(error: unknown): boolean;
