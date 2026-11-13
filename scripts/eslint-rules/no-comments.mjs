const DIRECTIVE =
  /^\s*(eslint-(disable|enable)|@ts-|@vitest-environment|webpackChunkName|\/\s*<reference|\*?\s*webpackChunkName)/;
const INLINE_DIRECTIVE = /webpackChunkName/;

function isDirective(comment) {
  return DIRECTIVE.test(comment.value) || INLINE_DIRECTIVE.test(comment.value);
}

const rule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      comment: "Comments are not allowed; rename or extract so the code says it.",
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === "Shebang" || isDirective(comment)) continue;
          context.report({ loc: comment.loc, messageId: "comment" });
        }
      },
    };
  },
};

export default rule;
