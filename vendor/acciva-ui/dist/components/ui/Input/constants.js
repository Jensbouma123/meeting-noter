export const DEFAULT_AUTOCOMPLETE = {
    email: "email",
    tel: "tel",
    url: "url",
    password: "current-password",
};
export function defaultInputMode(type, step) {
    switch (type) {
        case "email":
            return "email";
        case "tel":
            return "tel";
        case "url":
            return "url";
        case "search":
            return "search";
        case "number": {
            if (step === "any")
                return "decimal";
            if (typeof step === "string" && step.includes("."))
                return "decimal";
            if (typeof step === "number" && !Number.isInteger(step))
                return "decimal";
            return "numeric";
        }
        default:
            return undefined;
    }
}
export const DOUBLE_TRAILING_PADDING = {
    xxs: "pr-11",
    xs: "pr-12",
    sm: "pr-14",
    md: "pr-16",
    lg: "pr-18",
    xl: "pr-20",
    "2xl": "pr-22",
    "3xl": "pr-24",
};
// Addons sit flush against the field, so they take the field's own corner radius on their
// outer edge and square off on the edge they share with it.
export const ADDON_RADIUS_LEADING = {
    xxs: "rounded-l-md",
    xs: "rounded-l-md",
    sm: "rounded-l-lg",
    md: "rounded-l-lg",
    lg: "rounded-l-lg",
    xl: "rounded-l-xl",
    "2xl": "rounded-l-xl",
    "3xl": "rounded-l-2xl",
};
export const ADDON_RADIUS_TRAILING = {
    xxs: "rounded-r-md",
    xs: "rounded-r-md",
    sm: "rounded-r-lg",
    md: "rounded-r-lg",
    lg: "rounded-r-lg",
    xl: "rounded-r-xl",
    "2xl": "rounded-r-xl",
    "3xl": "rounded-r-2xl",
};
export const ADDON_JOIN_CLASSES = {
    none: "",
    leading: "rounded-l-none",
    trailing: "rounded-r-none",
    both: "rounded-none",
};
export const CLEAR_BUTTON_SIZE = {
    xxs: "size-4",
    xs: "size-5",
    sm: "size-6",
    md: "size-7",
    lg: "size-8",
    xl: "size-9",
    "2xl": "size-10",
    "3xl": "size-11",
};
