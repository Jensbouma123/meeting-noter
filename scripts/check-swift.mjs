import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const MAX_LINES = 150;
const ROOT = path.resolve(import.meta.dirname, "..", "helper");
const COMMENT = /(^|[^:"])\/\/|\/\*/;
const DIRECTIVE = /\/\/\s*swiftlint:/;

function swiftFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    if (entry === "build" || entry === ".build") return [];
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return swiftFiles(full);
    return full.endsWith(".swift") ? [full] : [];
  });
}

function violationsIn(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const total = lines.at(-1) === "" ? lines.length - 1 : lines.length;
  const found = [];
  if (total >= MAX_LINES) found.push(`${total} lines (limit is under ${MAX_LINES})`);
  lines.forEach((line, index) => {
    if (COMMENT.test(line) && !DIRECTIVE.test(line)) found.push(`comment on line ${index + 1}`);
  });
  return found.map((message) => `${path.relative(process.cwd(), file)}: ${message}`);
}

const problems = swiftFiles(ROOT).flatMap(violationsIn);
if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(`check-swift: ${problems.length} violation(s)`);
  process.exit(1);
}
console.log("check-swift: ok");
