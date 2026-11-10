export declare function pickSnapTarget(height: number, velocity: number, points: number[], travelDistance?: number): number;
/**
 * Detent-space counterpart to {@link pickSnapTarget}: returns the index of the detent a
 * release at `size` should land on. Ties break toward the detent already selected, so
 * duplicate detent sizes never make the panel appear to jump.
 */
export declare function pickDetentTarget(size: number, velocity: number, detentSizes: readonly number[], travelDistance?: number, currentIndex?: number): number;
