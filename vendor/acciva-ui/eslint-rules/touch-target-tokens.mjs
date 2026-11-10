const REM_PX = 16;
const SPACING_UNIT_PX = 4;
export const TOUCH_TARGET_PX = 44;

export const TOUCH_TARGET_CLASS = "touch-target-44";
export const TOUCH_TARGET_HELPER = "touchTargetClass";

export const NATIVE_INTERACTIVE_TAGS = new Set([
  "a",
  "button",
  "input",
  "select",
  "summary",
  "textarea",
]);

export const INTERACTIVE_ROLES = new Set([
  "button",
  "checkbox",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "treeitem",
]);

/** Utilities that already guarantee the 44px floor, or take the element out of the hit-test. */
export const TOUCH_TARGET_ESCAPES = new Set([TOUCH_TARGET_CLASS, "sr-only", "opacity-0"]);

/**
 * Variants an opt-in may carry and still count. A breakpoint prefix does not:
 * `sm:min-h-11` grows the target on wider screens, which is the opposite of the
 * phone-portrait baseline the floor exists for.
 */
export const COARSE_POINTER_VARIANTS = new Set(["pointer-coarse", "any-pointer-coarse"]);

/**
 * `.touch-target-44` works through a `::before`, which replaced elements never
 * render — these tags have to grow their real box on coarse pointers instead.
 */
export const NO_PSEUDO_ELEMENT_TAGS = new Set(["input", "select", "textarea"]);
export const COARSE_POINTER_FLOOR = "pointer-coarse:min-h-11";

export const SIZE_TOKEN = /^(size|h|min-h)-(.+)$/;

/** Pixel value of a Tailwind size scale step or arbitrary length, or null if unknown. */
export function lengthToPx(value) {
  const arbitrary = /^\[(-?[\d.]+)(px|rem)]$/.exec(value);
  if (arbitrary) {
    const amount = Number(arbitrary[1]);
    return arbitrary[2] === "rem" ? amount * REM_PX : amount;
  }
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * SPACING_UNIT_PX;
  if (value === "px") return 1;
  return null;
}
