/**
 * Local ESLint rules for ACCIVA-UI.
 *
 * Both rules encode a pattern the library already owns and that hand-rolled
 * markup keeps skipping — see `.agents/testing.md` for the contract and
 * `.agents/accessibility.md` for the WCAG success criteria they defend.
 */

const REM_PX = 16;
const SPACING_UNIT_PX = 4;
const TOUCH_TARGET_PX = 44;

const TOUCH_TARGET_CLASS = "touch-target-44";
const TOUCH_TARGET_HELPER = "touchTargetClass";

const NATIVE_INTERACTIVE_TAGS = new Set([
  "a",
  "button",
  "input",
  "select",
  "summary",
  "textarea",
]);

const INTERACTIVE_ROLES = new Set([
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

/** Roles whose own keyboard model (arrow keys + active descendant) drives the scroll. */
const MANAGED_SCROLL_ROLES = new Set([
  "combobox",
  "grid",
  "listbox",
  "menu",
  "menubar",
  "radiogroup",
  "tablist",
  "tree",
  "treegrid",
]);

const NATIVELY_FOCUSABLE_TAGS = new Set([
  "a",
  "button",
  "iframe",
  "input",
  "select",
  "textarea",
]);

/** Utilities that already guarantee the 44px floor, or take the element out of the hit-test. */
const TOUCH_TARGET_ESCAPES = new Set([TOUCH_TARGET_CLASS, "sr-only", "opacity-0"]);

/**
 * Variants an opt-in may carry and still count. A breakpoint prefix does not:
 * `sm:min-h-11` grows the target on wider screens, which is the opposite of the
 * phone-portrait baseline the floor exists for.
 */
const COARSE_POINTER_VARIANTS = new Set(["pointer-coarse", "any-pointer-coarse"]);

/**
 * `.touch-target-44` works through a `::before`, which replaced elements never
 * render — these tags have to grow their real box on coarse pointers instead.
 */
const NO_PSEUDO_ELEMENT_TAGS = new Set(["input", "select", "textarea"]);
const COARSE_POINTER_FLOOR = "pointer-coarse:min-h-11";

const SCROLL_TOKENS = new Set([
  "overflow-auto",
  "overflow-scroll",
  "overflow-x-auto",
  "overflow-x-scroll",
]);

const SIZE_TOKEN = /^(size|h|min-h)-(.+)$/;

function stripVariants(token) {
  const parts = token.split(":");
  const base = parts.pop();
  return { base, variants: parts };
}

/** Pixel value of a Tailwind size scale step or arbitrary length, or null if unknown. */
function lengthToPx(value) {
  const arbitrary = /^\[(-?[\d.]+)(px|rem)]$/.exec(value);
  if (arbitrary) {
    const amount = Number(arbitrary[1]);
    return arbitrary[2] === "rem" ? amount * REM_PX : amount;
  }
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * SPACING_UNIT_PX;
  if (value === "px") return 1;
  return null;
}

/**
 * Every string literal reachable from a JSX attribute value — covers `cn(...)`,
 * template literals, ternaries, arrays and object values, so a class hidden in a
 * variant map still counts.
 */
function collectStrings(node, out = []) {
  if (!node || typeof node !== "object") return out;
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") out.push(node.value);
      return out;
    case "TemplateLiteral":
      for (const quasi of node.quasis) out.push(quasi.value.cooked ?? quasi.value.raw);
      for (const expression of node.expressions) collectStrings(expression, out);
      return out;
    case "JSXExpressionContainer":
      return collectStrings(node.expression, out);
    default:
      for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "range") continue;
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) collectStrings(item, out);
        } else if (child && typeof child === "object" && typeof child.type === "string") {
          collectStrings(child, out);
        }
      }
      return out;
  }
}

function attribute(openingElement, name) {
  return openingElement.attributes.find(
    (attr) => attr.type === "JSXAttribute" && attr.name.type === "JSXIdentifier" && attr.name.name === name,
  );
}

function hasSpread(openingElement) {
  return openingElement.attributes.some((attr) => attr.type === "JSXSpreadAttribute");
}

function classTokens(openingElement) {
  const attr = attribute(openingElement, "className");
  if (!attr || !attr.value) return null;
  return collectStrings(attr.value)
    .flatMap((value) => value.split(/\s+/))
    .filter(Boolean);
}

function literalAttributeValue(openingElement, name) {
  const attr = attribute(openingElement, name);
  if (!attr || !attr.value) return null;
  if (attr.value.type === "Literal") return typeof attr.value.value === "string" ? attr.value.value : null;
  const strings = collectStrings(attr.value);
  return strings.length === 1 ? strings[0] : null;
}

function elementName(openingElement) {
  return openingElement.name.type === "JSXIdentifier" ? openingElement.name.name : null;
}

function isIntrinsic(name) {
  return typeof name === "string" && /^[a-z]/.test(name);
}

function callsHelper(openingElement, helper) {
  const attr = attribute(openingElement, "className");
  if (!attr || !attr.value) return false;
  const source = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (
      node.type === "CallExpression" &&
      ((node.callee.type === "Identifier" && node.callee.name === helper) ||
        (node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === helper))
    ) {
      source.push(helper);
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === "parent" || key === "loc" || key === "range") continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === "object" && typeof child.type === "string") walk(child);
    }
  };
  walk(attr.value);
  return source.length > 0;
}

const touchTarget44 = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Interactive elements smaller than 44px must opt into the `touch-target-44` utility (WCAG 2.2 SC 2.5.5).",
    },
    schema: [],
    messages: {
      pseudo:
        "`<{{element}}>` is {{px}}px via `{{token}}` — below the 44px touch floor (WCAG 2.2 SC 2.5.5). Add `{{cls}}` to its className, or render the ACCIVA `<Button>` primitive so `{{helper}}(size)` applies it. The utility is gated to `pointer: coarse` and costs nothing visually.",
      replaced:
        "`<{{element}}>` is {{px}}px via `{{token}}` — below the 44px touch floor (WCAG 2.2 SC 2.5.5). `{{cls}}` cannot help here (form controls render no `::before`): add `{{floor}}` so the control's own box reaches 44px on touch, or render the ACCIVA `<Input>`/`<Select>` primitive.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = elementName(node);
        if (!name) return;

        const role = literalAttributeValue(node, "role");
        const interactive =
          (isIntrinsic(name) && NATIVE_INTERACTIVE_TAGS.has(name)) ||
          (role !== null && INTERACTIVE_ROLES.has(role));
        if (!interactive) return;

        if (name === "input" && literalAttributeValue(node, "type") === "hidden") return;
        if (name === "a" && !attribute(node, "href") && !hasSpread(node)) return;
        if (callsHelper(node, TOUCH_TARGET_HELPER)) return;

        const tokens = classTokens(node);
        if (!tokens) return;

        let smallest = null;
        for (const token of tokens) {
          const { base, variants } = stripVariants(token);
          const optInScope = variants.every((variant) => COARSE_POINTER_VARIANTS.has(variant));

          if (optInScope && TOUCH_TARGET_ESCAPES.has(base)) return;

          const match = SIZE_TOKEN.exec(base);
          if (!match) continue;
          const px = lengthToPx(match[2]);
          if (px === null) continue;
          if (optInScope && px >= TOUCH_TARGET_PX) return;
          if (variants.length > 0) continue;
          // A `min-h` under the floor is a floor, not a size — it never proves the
          // rendered box is short, so it is not itself a finding.
          if (match[1] === "min-h") continue;
          if (smallest === null || px < smallest.px) smallest = { px, token: base };
        }
        if (!smallest) return;

        context.report({
          node,
          messageId: NO_PSEUDO_ELEMENT_TAGS.has(name) ? "replaced" : "pseudo",
          data: {
            element: name,
            px: String(smallest.px),
            token: smallest.token,
            cls: TOUCH_TARGET_CLASS,
            floor: COARSE_POINTER_FLOOR,
            helper: TOUCH_TARGET_HELPER,
          },
        });
      },
    };
  },
};

function hasFocusableDescendant(openingElement) {
  const element = openingElement.parent;
  if (!element || element.type !== "JSXElement") return false;

  let found = false;
  const walk = (node) => {
    if (found || !node || typeof node !== "object") return;
    if (node.type === "JSXOpeningElement" && node !== openingElement) {
      if (attribute(node, "tabIndex")) {
        found = true;
        return;
      }
      const name = elementName(node);
      if (isIntrinsic(name) && NATIVELY_FOCUSABLE_TAGS.has(name)) {
        found = true;
        return;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "parent" || key === "loc" || key === "range") continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === "object" && typeof child.type === "string") walk(child);
    }
  };
  element.children.forEach(walk);
  return found;
}

const scrollableRegionTabindex = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Horizontally scrollable containers must be reachable by keyboard (WCAG 2.2 SC 2.1.1).",
    },
    schema: [],
    messages: {
      missing:
        "`{{token}}` on `<{{element}}>` makes it scrollable, but nothing here is keyboard reachable — SC 2.1.1 fails. Add `tabIndex={0} role=\"region\" aria-label=\"…, scrollable horizontally\"` plus `focus-ring`, as `RoleTable.tsx` and `CopySnippet.tsx` do, or give the region focusable content of its own.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = elementName(node);
        if (!name) return;

        const tokens = classTokens(node);
        if (!tokens) return;

        const scrollToken = tokens.find((token) => SCROLL_TOKENS.has(stripVariants(token).base));
        if (!scrollToken) return;

        if (attribute(node, "tabIndex")) return;
        if (isIntrinsic(name) && NATIVELY_FOCUSABLE_TAGS.has(name)) return;
        if (attribute(node, "contentEditable")) return;
        if (literalAttributeValue(node, "aria-hidden") === "true") return;

        const role = literalAttributeValue(node, "role");
        if (role !== null && MANAGED_SCROLL_ROLES.has(role)) return;

        if (hasFocusableDescendant(node)) return;

        context.report({
          node,
          messageId: "missing",
          data: { element: name, token: scrollToken },
        });
      },
    };
  },
};

const plugin = {
  meta: { name: "acciva", version: "1.0.0" },
  rules: {
    "touch-target-44": touchTarget44,
    "scrollable-region-tabindex": scrollableRegionTabindex,
  },
};

export default plugin;
