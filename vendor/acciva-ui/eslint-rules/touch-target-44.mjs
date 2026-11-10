import {
  attribute,
  callsHelper,
  classTokens,
  elementName,
  hasSpread,
  isIntrinsic,
  literalAttributeValue,
  stripVariants,
} from "./ast.mjs";
import {
  COARSE_POINTER_FLOOR,
  COARSE_POINTER_VARIANTS,
  INTERACTIVE_ROLES,
  NATIVE_INTERACTIVE_TAGS,
  NO_PSEUDO_ELEMENT_TAGS,
  SIZE_TOKEN,
  TOUCH_TARGET_CLASS,
  TOUCH_TARGET_ESCAPES,
  TOUCH_TARGET_HELPER,
  TOUCH_TARGET_PX,
  lengthToPx,
} from "./touch-target-tokens.mjs";

export const touchTarget44 = {
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
