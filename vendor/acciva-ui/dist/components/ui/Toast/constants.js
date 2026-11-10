// Solid accent bar: a border-l-* utility loses to the unlayered base `* { border-color }` and renders grey.
export const TOAST_BAR = {
    info: "bg-info",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
};
export const DEFAULT_DURATION_MS = 5000;
// A toast with an action needs time to be read and acted on (SC 2.2.1); the timer still pauses on hover/focus.
export const ACTION_DURATION_MS = 10000;
export function defaultToastDuration(variant, hasAction) {
    if (variant === "danger")
        return Infinity;
    return hasAction ? ACTION_DURATION_MS : DEFAULT_DURATION_MS;
}
export const DEFAULT_MAX_VISIBLE = 3;
export const DEFAULT_POSITION = "bottom-center";
export const DEFAULT_HOTKEY = "F6";
// Matches globals.css's acciva-fade-in keyframe duration, so the exit fade and the
// delayed removal-from-array stay in lockstep.
export const EXIT_DURATION_MS = 150;
export const ALL_POSITIONS = [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
];
export const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
export const POSITION_HORIZONTAL_CLASS = {
    "top-left": "sm:left-4 sm:right-auto items-stretch sm:items-start",
    "top-center": "sm:left-1/2 sm:right-auto sm:-translate-x-1/2 items-stretch sm:items-center",
    "top-right": "sm:right-4 sm:left-auto items-stretch sm:items-end",
    "bottom-left": "sm:left-4 sm:right-auto items-stretch sm:items-start",
    "bottom-center": "sm:left-1/2 sm:right-auto sm:-translate-x-1/2 items-stretch sm:items-center",
    "bottom-right": "sm:right-4 sm:left-auto items-stretch sm:items-end",
};
