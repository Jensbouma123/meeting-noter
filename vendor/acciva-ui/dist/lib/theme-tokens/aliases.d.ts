import { type Ramp, type StepLabel } from "../color/index.js";
import { type ShadeScale, type TailwindStep } from "./constants.js";
/**
 * One alias table serves every palette so that `primary-100` and `accent-100`
 * stay siblings; it is solved on the brand ramp, the only one used as an action
 * fill.
 */
export declare function resolveAliases(brand: Ramp): Readonly<Record<TailwindStep, StepLabel>>;
export declare function shadeScale(ramp: Ramp, aliases: Readonly<Record<TailwindStep, StepLabel>>): ShadeScale;
