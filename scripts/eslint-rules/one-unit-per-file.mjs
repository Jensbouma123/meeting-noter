const COMPONENT = /^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/;
const HOOK = /^use[A-Z0-9]/;
const WRAPPERS = new Set(["memo", "forwardRef"]);
const NAMED_UNIT = /(Service|Store)$/;

function normalize(text) {
  return text.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

function baseName(filename) {
  const file = filename.split("\\").join("/").split("/").pop();
  return file.replace(/(\.test|\.spec)?\.[a-z]+$/, "");
}

function classify(name, isClass) {
  if (isClass) return "class";
  if (HOOK.test(name)) return "hook";
  if (COMPONENT.test(name)) return "component";
  return null;
}

function declaredUnits(declaration) {
  if (!declaration) return [];
  if (declaration.type === "ClassDeclaration") {
    return [{ node: declaration, name: declaration.id?.name ?? "default", kind: "class" }];
  }
  if (declaration.type === "FunctionDeclaration" && declaration.id) {
    const kind = classify(declaration.id.name, false);
    return kind ? [{ node: declaration, name: declaration.id.name, kind }] : [];
  }
  if (declaration.type !== "VariableDeclaration") return [];
  return declaration.declarations.flatMap((item) => {
    const callable = ["ArrowFunctionExpression", "FunctionExpression"].includes(item.init?.type);
    const callee = item.init?.callee;
    const wrapped =
      item.init?.type === "CallExpression" &&
      WRAPPERS.has(callee?.name ?? callee?.property?.name);
    if (item.id.type !== "Identifier" || !(callable || wrapped)) return [];
    const kind = classify(item.id.name, false);
    return kind ? [{ node: item, name: item.id.name, kind }] : [];
  });
}

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      extra: "A file may export only one class, component or hook; '{{name}}' is another.",
      naming: "'{{name}}' must live in a file named after it.",
    },
  },
  create(context) {
    const units = [];
    const fileKey = normalize(baseName(context.filename));
    const collect = (node) => units.push(...declaredUnits(node.declaration));
    return {
      ExportNamedDeclaration: collect,
      ExportDefaultDeclaration: collect,
      "Program:exit"() {
        units.slice(1).forEach((unit) =>
          context.report({ node: unit.node, messageId: "extra", data: { name: unit.name } }),
        );
        for (const unit of units) {
          if (unit.kind !== "class" || !NAMED_UNIT.test(unit.name)) continue;
          if (normalize(unit.name) === fileKey) continue;
          context.report({ node: unit.node, messageId: "naming", data: { name: unit.name } });
        }
      },
    };
  },
};
