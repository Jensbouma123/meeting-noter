import {
  attribute,
  classTokens,
  elementName,
  isIntrinsic,
  literalAttributeValue,
  stripVariants,
} from "./ast.mjs";

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

const SCROLL_TOKENS = new Set([
  "overflow-auto",
  "overflow-scroll",
  "overflow-x-auto",
  "overflow-x-scroll",
]);

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

export const scrollableRegionTabindex = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Horizontally scrollable containers must be reachable by keyboard (WCAG 2.2 SC 2.1.1).",
    },
    schema: [],
    messages: {
      missing:
        "`{{token}}` on `<{{element}}>` makes it scrollable, but nothing here is keyboard reachable — SC 2.1.1 fails. Add `tabIndex={0} role=\"region\" aria-label=\"…, scrollable horizontally\"` plus `focus-ring`, as `RoleTable.tsx` and `CopySnippetBody.tsx` do, or give the region focusable content of its own.",
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
