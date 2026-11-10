export function stripVariants(token) {
  const parts = token.split(":");
  const base = parts.pop();
  return { base, variants: parts };
}

/**
 * Every string literal reachable from a JSX attribute value — covers `cn(...)`,
 * template literals, ternaries, arrays and object values, so a class hidden in a
 * variant map still counts.
 */
export function collectStrings(node, out = []) {
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

export function attribute(openingElement, name) {
  return openingElement.attributes.find(
    (attr) => attr.type === "JSXAttribute" && attr.name.type === "JSXIdentifier" && attr.name.name === name,
  );
}

export function hasSpread(openingElement) {
  return openingElement.attributes.some((attr) => attr.type === "JSXSpreadAttribute");
}

export function classTokens(openingElement) {
  const attr = attribute(openingElement, "className");
  if (!attr || !attr.value) return null;
  return collectStrings(attr.value)
    .flatMap((value) => value.split(/\s+/))
    .filter(Boolean);
}

export function literalAttributeValue(openingElement, name) {
  const attr = attribute(openingElement, name);
  if (!attr || !attr.value) return null;
  if (attr.value.type === "Literal") return typeof attr.value.value === "string" ? attr.value.value : null;
  const strings = collectStrings(attr.value);
  return strings.length === 1 ? strings[0] : null;
}

export function elementName(openingElement) {
  return openingElement.name.type === "JSXIdentifier" ? openingElement.name.name : null;
}

export function isIntrinsic(name) {
  return typeof name === "string" && /^[a-z]/.test(name);
}

export function callsHelper(openingElement, helper) {
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
