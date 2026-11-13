const ALLOWED_FILE = /(^|\/)(types\.ts|[^/]+\.types\.ts|types\/[^/]+|[^/]+\.d\.ts)$/;

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      misplaced:
        "{{kind}} '{{name}}' must live in types.ts, *.types.ts or a types/ folder.",
    },
  },
  create(context) {
    const filename = context.filename.split("\\").join("/");
    if (ALLOWED_FILE.test(filename)) return {};
    const report = (node, kind) =>
      context.report({
        node,
        messageId: "misplaced",
        data: { kind, name: node.id.name },
      });
    return {
      TSInterfaceDeclaration: (node) => report(node, "interface"),
      TSTypeAliasDeclaration: (node) => report(node, "type alias"),
      TSEnumDeclaration: (node) => report(node, "enum"),
    };
  },
};
