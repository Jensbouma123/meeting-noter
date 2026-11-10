import { solveMultiContextDualMode } from "./multi.js";
/**
 * Solve one role for both modes at once against a single context pair.
 */
export function solveDualMode(request) {
    return solveMultiContextDualMode({
        ramp: request.ramp,
        intent: request.intent,
        use: request.use,
        contexts: [
            {
                lightBackground: request.lightBackground,
                darkBackground: request.darkBackground,
                use: request.use,
            },
        ],
    });
}
