import { MCP_SERVER_NAME, mcpEntry } from "./mcp-entry";
import type { CliAssistant } from "./types";

export const CLI_BIN: Record<CliAssistant, string> = {
  "claude-code": "claude",
  codex: "codex",
  agy: "agy",
};

export function addArgs(id: CliAssistant, env: NodeJS.ProcessEnv): string[] {
  const { command, args } = mcpEntry(env);
  const scope = id === "claude-code" ? ["--scope", "user"] : [];
  // `agy mcp add <name> <cmd> [args...]` takes the command directly, without a `--` separator.
  const separator = id === "agy" ? [] : ["--"];
  return [
    "mcp",
    "add",
    ...scope,
    MCP_SERVER_NAME,
    ...separator,
    command,
    ...args,
  ];
}

export function removeArgs(id: CliAssistant): string[] {
  const scope = id === "claude-code" ? ["--scope", "user"] : [];
  return ["mcp", "remove", MCP_SERVER_NAME, ...scope];
}

export function manualCommand(
  id: CliAssistant,
  env: NodeJS.ProcessEnv,
): string {
  const quoted = addArgs(id, env).map((a) =>
    /^[\w./:=@-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`,
  );
  return [CLI_BIN[id], ...quoted].join(" ");
}
