/** The panel's real transition length, read from the token the CSS actually uses.
 *  `--motion-spatial` is 180ms on a fine pointer, 260ms under `(pointer: coarse)` and
 *  0ms under `prefers-reduced-motion`, so a hardcoded constant unmounted the sheet
 *  mid-flight on touch. Reading the token keeps the timer and the transition in step. */
export declare function exitDurationMs(): number;
