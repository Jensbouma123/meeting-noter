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
export const ROLE_THRESHOLDS = {
    "border-subtle": {
        criterion: null,
        aa: { ratio: 0, lc: 0 },
        aaa: { ratio: 0, lc: 0 },
    },
    "border-control": {
        criterion: "1.4.11",
        aa: { ratio: 3.0, lc: 45 },
        aaa: { ratio: 4.5, lc: 60 },
    },
    focus: {
        criterion: "2.4.13",
        aa: { ratio: 3.0, lc: 60 },
        aaa: { ratio: 4.5, lc: 60 },
    },
    text: {
        criterion: "1.4.3",
        aa: { ratio: 4.5, lc: 75 },
        aaa: { ratio: 7.0, lc: 90 },
    },
    "action-fill": {
        criterion: "1.4.3",
        aa: { ratio: 4.5, lc: 75 },
        aaa: { ratio: 7.0, lc: 90 },
    },
    "badge-text": {
        criterion: "1.4.3",
        aa: { ratio: 4.5, lc: 75 },
        aaa: { ratio: 7.0, lc: 90 },
    },
};
