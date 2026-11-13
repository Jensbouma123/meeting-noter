import rule from "./no-comments.mjs";
import { runRuleTests } from "./rule-tester";

runRuleTests("no-comments", rule, {
  valid: [
    { code: "const a = 1;" },
    { code: "// eslint-disable-next-line no-console\nconsole.log(1);" },
    { code: "/* eslint-disable */\nconst a = 1;" },
    { code: "// @ts-expect-error reason\nconst a: number = 'x';" },
    { code: "// @vitest-environment jsdom\nconst a = 1;" },
    { code: "/// <reference types=\"node\" />\nconst a = 1;" },
    { code: "import(/* webpackChunkName: \"x\" */ './x');" },
  ],
  invalid: [
    { code: "// note\nconst a = 1;", errors: [{ messageId: "comment" }] },
    { code: "/** doc */\nconst a = 1;", errors: [{ messageId: "comment" }] },
    { code: "const a = 1; /* trailing */", errors: [{ messageId: "comment" }] },
  ],
});
