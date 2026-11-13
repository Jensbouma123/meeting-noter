import { RuleTester, type Rule } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { describe, it } from "vitest";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

export function runRuleTests(name: string, rule: unknown, cases: Parameters<RuleTester["run"]>[2]) {
  tester.run(name, rule as Rule.RuleModule, cases);
}
