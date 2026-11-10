/**
 * Composes a caller-supplied signal with a client-imposed timeout into one signal,
 * without mutating or replacing the caller's own signal (React Query owns that one).
 */
export function composeAbortSignals(callerSignal, timeoutMs) {
    const controller = new AbortController();
    let timedOut = false;
    const teardown = [];
    const abortFrom = (signal) => {
        if (!controller.signal.aborted)
            controller.abort(signal.reason);
    };
    if (callerSignal) {
        if (callerSignal.aborted) {
            abortFrom(callerSignal);
        }
        else {
            const onCallerAbort = () => abortFrom(callerSignal);
            callerSignal.addEventListener("abort", onCallerAbort, { once: true });
            teardown.push(() => callerSignal.removeEventListener("abort", onCallerAbort));
        }
    }
    let timer;
    if (timeoutMs != null && timeoutMs > 0 && !controller.signal.aborted) {
        timer = setTimeout(() => {
            timedOut = true;
            controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, "TimeoutError"));
        }, timeoutMs);
    }
    return {
        signal: controller.signal,
        didTimeout: () => timedOut,
        cleanup: () => {
            if (timer !== undefined)
                clearTimeout(timer);
            for (const remove of teardown)
                remove();
        },
    };
}
export function isAbortError(error) {
    return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}
