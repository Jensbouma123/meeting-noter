import rule from "./types-in-own-files.mjs";
import { runRuleTests } from "./rule-tester";

runRuleTests("types-in-own-files", rule, {
  valid: [
    { code: "export interface A { x: number }", filename: "src/lib/types.ts" },
    { code: "export type A = string;", filename: "src/Button.types.ts" },
    { code: "export enum E { A }", filename: "src/lib/types/segment.ts" },
    { code: "export const a = 1;", filename: "src/lib/impl.ts" },
  ],
  invalid: [
    {
      code: "interface A { x: number }",
      filename: "src/lib/impl.ts",
      errors: [{ messageId: "misplaced", data: { kind: "interface", name: "A" } }],
    },
    {
      code: "export type B = string;",
      filename: "src/lib/impl.ts",
      errors: [{ messageId: "misplaced", data: { kind: "type alias", name: "B" } }],
    },
    {
      code: "enum C { A }",
      filename: "src/components/Button.tsx",
      errors: [{ messageId: "misplaced", data: { kind: "enum", name: "C" } }],
    },
  ],
});
