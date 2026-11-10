export type ContrastRoleCategory = "text" | "border-subtle" | "border-control" | "focus" | "action-fill" | "badge-text";
export type AdjustableTarget = "foreground" | "background";
export type RoleThresholdConfig = {
    /**
     * The WCAG 2.2 success criterion the category is gated on, or `null` when the
     * role carries no information and is therefore exempt. A `null` criterion is
     * reported as exempt — never as a pass.
     */
    readonly criterion: string | null;
    /** `ratio` is the gate. `lc` is the APCA target, advisory only. */
    readonly aa: {
        readonly ratio: number;
        readonly lc: number;
    };
    readonly aaa: {
        readonly ratio: number;
        readonly lc: number;
    };
};
/**
 * What each role is actually held to, at the ratio its criterion actually
 * names.
 *
 * `border-subtle` is the purely decorative separator — a hairline between two
 * rows that carries no state and identifies no control. SC 1.4.11 exempts it,
 * so it is graded `exempt`, which is not the same claim as a pass. Every border
 * that bounds a control, marks a field, or carries meaning is `border-control`
 * and owes the real 3.0:1. The 1.8:1 this table used to call AA was neither.
 */
export declare const ROLE_THRESHOLDS: Record<ContrastRoleCategory, RoleThresholdConfig>;
/** `exempt` is a third answer, distinct from both `pass` and `fail`. */
export type ContrastVerdict = "pass" | "fail" | "exempt";
