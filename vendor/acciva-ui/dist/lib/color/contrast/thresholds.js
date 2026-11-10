/** Minimum |Lc| required per use, APCA bronze-tier lookup. */
export const APCA_THRESHOLDS = {
    "body-preferred": 90,
    body: 75,
    "non-body": 60,
    large: 45,
    ui: 30,
    decorative: 15,
};
/** Minimum WCAG 2.1 AA ratio required per use. */
export const WCAG_THRESHOLDS = {
    "body-preferred": 4.5,
    body: 4.5,
    "non-body": 4.5,
    large: 3,
    ui: 3,
    decorative: 0,
};
/** Highest APCA tier a signed Lc qualifies for. Polarity-independent. */
export function apcaLevel(lc) {
    const magnitude = Math.abs(lc);
    if (magnitude >= APCA_THRESHOLDS["body-preferred"])
        return "body-preferred";
    if (magnitude >= APCA_THRESHOLDS.body)
        return "body";
    if (magnitude >= APCA_THRESHOLDS["non-body"])
        return "non-body";
    if (magnitude >= APCA_THRESHOLDS.large)
        return "large";
    if (magnitude >= APCA_THRESHOLDS.ui)
        return "ui";
    if (magnitude >= APCA_THRESHOLDS.decorative)
        return "decorative";
    return "invisible";
}
