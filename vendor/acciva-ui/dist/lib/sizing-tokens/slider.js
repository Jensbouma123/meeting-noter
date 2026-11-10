// Slider.tsx
export const SLIDER_TRACK_HEIGHT = {
    xxs: "h-1",
    xs: "h-1",
    sm: "h-1.5",
    md: "h-1.5",
    lg: "h-2",
    xl: "h-2",
    "2xl": "h-2.5",
    "3xl": "h-3",
};
export const SLIDER_THUMB_SIZE = {
    xxs: "size-3",
    xs: "size-3.5",
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
    xl: "size-7",
    "2xl": "size-8",
    "3xl": "size-9",
};
// The painted thumb is smaller than the SC 2.5.8 24x24 floor below `lg`, so the
// `role="slider"` element it lives in is sized from this scale instead - the
// per-tier maximum of SLIDER_THUMB_SIZE and TARGET_MIN. Every pointer input is
// covered, not just coarse ones, which is what SC 2.5.8 asks for; `touch-target-44`
// still layers the wider AAA 2.5.5 area on top for coarse pointers.
export const SLIDER_THUMB_TARGET = {
    xxs: "size-6",
    xs: "size-6",
    sm: "size-6",
    md: "size-6",
    lg: "size-6",
    xl: "size-7",
    "2xl": "size-8",
    "3xl": "size-9",
};
// Height of the pointer-event-owning row, matched to the thumb diameter so
// the thumb is never clipped by its own hit area.
export const SLIDER_ROW_HEIGHT = {
    xxs: "h-3",
    xs: "h-3.5",
    sm: "h-4",
    md: "h-5",
    lg: "h-6",
    xl: "h-7",
    "2xl": "h-8",
    "3xl": "h-9",
};
