// Bundles the meetings MCP server (src/mcp/main.ts) and its SDK into one file
// that runs with plain `node`: `npm run mcp:build` for a checkout, package.sh
// for the installed app. Output: build/mcp/meetings-mcp.mjs (or MCP_OUT).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'rolldown';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

export default defineConfig({
  input: fileURLToPath(new URL('../../src/mcp/main.ts', import.meta.url)),
  platform: 'node',
  transform: { define: { MEETING_NOTER_VERSION: JSON.stringify(version) } },
  output: { file: process.env.MCP_OUT ?? 'build/mcp/meetings-mcp.mjs', format: 'esm', codeSplitting: false },
});
