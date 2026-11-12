import { solveMultiContextDualMode } from "@/lib/color/constrain/multi";
import type { DualModeRequest, DualModeSolution } from "@/lib/color/constrain/types";

/**
 * Solve one role for both modes at once against a single context pair.
 */
export function solveDualMode(request: DualModeRequest): DualModeSolution {
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
