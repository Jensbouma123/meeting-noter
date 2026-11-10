type Props = Record<string, unknown>;
/**
 * Props a Slot-style `asChild` component merges onto its child. A handler present on both
 * runs the child's first, then the slot's unless the child called `preventDefault()`, so the
 * child's own `onClick` is composed with, never replaced.
 */
export declare function composeSlotProps(child: Props, slot: Props): Props;
export {};
