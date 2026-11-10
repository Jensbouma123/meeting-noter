export const plural = (n) => (n === 1 ? "1 file" : `${n} files`);
export const DEFAULT_MESSAGES = {
    dropPrompt: (multiple) => (multiple ? "Drag files here or" : "Drag a file here or"),
    browse: "browse",
    change: "Change",
    empty: "No file chosen",
    dropActive: "Drop to add",
    dropReject: "File type not accepted",
    acceptHint: (types, maxSize) => [types, maxSize && `up to ${maxSize}`].filter(Boolean).join(" · "),
    added: (files) => (files.length === 1 ? `${files[0].name} added` : `${plural(files.length)} added`),
    removed: (name) => `${name} removed`,
    processing: (count) => `Processing ${plural(count)}…`,
    rejected: (r) => r.message,
    type: "isn't an accepted file type",
    maxSize: (limit) => `is larger than ${limit}`,
    minSize: (limit) => `is smaller than ${limit}`,
    count: (max) => `wasn't added: limit is ${plural(max)}`,
    process: "couldn't be processed",
    cropTitle: "Crop image",
    cropApply: "Apply",
    cropCancel: "Cancel",
    cropCancelled: "Crop cancelled",
    remove: (name) => `Remove ${name}`,
    crop: (name) => `Crop ${name}`,
    uploaded: (name) => `${name} uploaded`,
    failed: (name, error) => (error ? `${name} failed: ${error}` : `${name} failed`),
};
export const AVATAR_SIZE = {
    xxs: "size-12",
    xs: "size-14",
    sm: "size-20",
    md: "size-24",
    lg: "size-28",
    xl: "size-32",
    "2xl": "size-36",
    "3xl": "size-40",
};
const STEP_DOWN = {
    xxs: "xxs",
    xs: "xxs",
    sm: "xs",
    md: "sm",
    lg: "md",
    xl: "lg",
    "2xl": "xl",
    "3xl": "2xl",
};
// The compact Browse affordance sits inside the Input-height row, one tier below it.
export function stepDown(size) {
    if (typeof size === "string")
        return STEP_DOWN[size];
    const { base, sm, md, lg } = size;
    return {
        base: STEP_DOWN[base],
        sm: sm && STEP_DOWN[sm],
        md: md && STEP_DOWN[md],
        lg: lg && STEP_DOWN[lg],
    };
}
export const PEER_FOCUS = "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500";
export const SAFE_PREVIEW = /^(https|blob):/i;
