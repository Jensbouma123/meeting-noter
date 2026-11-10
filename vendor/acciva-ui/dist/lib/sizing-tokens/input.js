// Input.tsx: base horizontal padding when no icon occupies that side.
export const INPUT_PADDING_X = {
    xxs: "px-1.5",
    xs: "px-2",
    sm: "px-2.5",
    md: "px-3",
    lg: "px-3.5",
    xl: "px-4",
    "2xl": "px-4.5",
    "3xl": "px-5",
};
// Input.tsx: absolute inset for the leading/trailing icon slot — matches
// INPUT_PADDING_X so the icon sits flush with where the unadorned padding
// would otherwise start.
export const INPUT_ICON_INSET = {
    xxs: "left-1.5",
    xs: "left-2",
    sm: "left-2.5",
    md: "left-3",
    lg: "left-3.5",
    xl: "left-4",
    "2xl": "left-4.5",
    "3xl": "left-5",
};
export const INPUT_ICON_INSET_TRAILING = {
    xxs: "right-1.5",
    xs: "right-2",
    sm: "right-2.5",
    md: "right-3",
    lg: "right-3.5",
    xl: "right-4",
    "2xl": "right-4.5",
    "3xl": "right-5",
};
// Input.tsx: extra padding on the icon side = inset + icon width + a comfortable gap,
// so text and cursor never overlap the icon at any size tier.
export const INPUT_ICON_PADDING_LEADING = {
    xxs: "pl-6",
    xs: "pl-7",
    sm: "pl-8",
    md: "pl-9",
    lg: "pl-10",
    xl: "pl-11",
    "2xl": "pl-12",
    "3xl": "pl-14",
};
export const INPUT_ICON_PADDING_TRAILING = {
    xxs: "pr-6",
    xs: "pr-7",
    sm: "pr-8",
    md: "pr-9",
    lg: "pr-10",
    xl: "pr-11",
    "2xl": "pr-12",
    "3xl": "pr-14",
};
// Input.tsx: three trailing occupants at once (clear + password-reveal + trailingIcon).
// Continues the same per-tier growth as DOUBLE_TRAILING_PADDING's own increment over the
// single-icon padding above, so a third same-sized occupant never clips the input text.
export const TRIPLE_TRAILING_PADDING = {
    xxs: "pr-16",
    xs: "pr-17",
    sm: "pr-20",
    md: "pr-23",
    lg: "pr-26",
    xl: "pr-29",
    "2xl": "pr-32",
    "3xl": "pr-34",
};
