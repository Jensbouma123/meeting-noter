import rule from "./one-unit-per-file.mjs";
import { runRuleTests } from "./rule-tester";

runRuleTests("one-unit-per-file", rule, {
  valid: [
    { code: "export class A {}", filename: "a.ts" },
    { code: "export function Button() { return null }", filename: "Button.tsx" },
    { code: "export const useThing = () => 1;", filename: "use-thing.ts" },
    { code: "export function helper() {}\nexport function other() {}", filename: "util.ts" },
    { code: "export class MeetingService {}", filename: "meeting-service.ts" },
    { code: "export class SessionStore {}", filename: "SessionStore.ts" },
  ],
  invalid: [
    {
      code: "export class A {}\nexport class B {}",
      filename: "a.ts",
      errors: [{ messageId: "extra", data: { name: "B" } }],
    },
    {
      code: "export function Card() { return null }\nexport const Panel = () => null;",
      filename: "Card.tsx",
      errors: [{ messageId: "extra", data: { name: "Panel" } }],
    },
    {
      code: "export function useA() {}\nexport function useB() {}",
      filename: "hooks.ts",
      errors: [{ messageId: "extra", data: { name: "useB" } }],
    },
    {
      code: "export class MeetingService {}",
      filename: "helpers.ts",
      errors: [{ messageId: "naming", data: { name: "MeetingService" } }],
    },
  ],
});

runRuleTests("one-unit-per-file http handlers and constants", rule, {
  valid: [
    { code: "export async function GET() {}\nexport async function POST() {}", filename: "route.ts" },
    { code: "export const A = Object.freeze({});\nexport const B = 1;", filename: "x.ts" },
  ],
  invalid: [],
});
