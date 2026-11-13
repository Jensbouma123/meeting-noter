# Meetings for AI agents (MCP)

Meeting Noter keeps every meeting on this Mac, in

```
~/Library/Application Support/Meeting Noter/meetings.db    SQLite: meetings, segments, speakers + full-text index
~/Library/Application Support/Meeting Noter/meetings/      one Markdown file per meeting
```

The Markdown files (title, date, participants, speakers, summary, transcript) can be read by
any tool. For AI agents there is also an MCP server that reads the same
database, read-only. It has five tools:

| Tool | What it does |
| --- | --- |
| `list_meetings` | Meetings, newest first: id, title, date, duration, speakers (`limit`, `offset`, `folderId`, `includeSubfolders`) |
| `search_meetings` | Full-text search over titles, summaries and transcripts (`query`, `limit`, `folderId`, `includeSubfolders`) |
| `list_folders` | Every folder: id, name, parent folder and full path |
| `get_meeting` | One meeting by `id`, as Markdown (default) or `format: "json"`. Both include auto-detected, unconfirmed decision and action suggestions (`insights`) when present |
| `get_active_meeting` | The meeting open in Meeting Noter as Markdown, with `is_live` (true while it is being recorded). No arguments. When no meeting is open it says so instead |

Nothing leaves the Mac: the server talks to the agent over stdio and only opens
the database file.

## Folders

Meetings can be filed in nested folders; a meeting with no folder sits at the
top level. `list_folders` returns every folder with its `id`, `name`,
`parentId` (null at the top level) and `path` (for example
`Client work/Acme/Kick-off`), so an agent can pick the folder to look in.

`list_meetings` and `search_meetings` take two folder filters:

| Argument | What it does |
| --- | --- |
| `folderId` | Only meetings filed in that folder. Get ids from `list_folders`. Leave it out for every meeting, filed or not; unfiled meetings never match a folder. |
| `includeSubfolders` | `true` also matches meetings in the folders below `folderId`. Off by default, so a folder means just that folder. Ignored without `folderId`. |

`get_meeting` reads the meeting itself and takes no folder filter.

## Setup

The fastest way: open Meeting Noter, go to **Settings › Connect AI assistant**
and click **Connect** next to Claude Desktop, Claude Code or Codex. The app
writes the same entry the manual steps below write, and shows the status of
each assistant (connected, not connected, or not found on this Mac). Connecting
Claude Desktop first asks you to confirm: the app backs up
`claude_desktop_config.json` next to the original (the backup path is shown)
and only then edits it. **Disconnect** removes the entry again. If an
assistant is not found, or the one-click step fails, use the manual steps.

The installer ships the server as one file. Replace `YOU` with your macOS user
name (`whoami`); config files do not expand `~`.

**Claude Code** — run once in Terminal:

```bash
claude mcp add --scope user meeting-noter -- \
  "$HOME/Library/Application Support/Meeting Noter/app/node/bin/node" \
  "$HOME/Library/Application Support/Meeting Noter/app/mcp/meetings-mcp.mjs"
```

**Codex** — run once in Terminal (Codex CLI keeps its MCP servers in
`~/.codex/config.toml`):

```bash
codex mcp add meeting-noter -- \
  "$HOME/Library/Application Support/Meeting Noter/app/node/bin/node" \
  "$HOME/Library/Application Support/Meeting Noter/app/mcp/meetings-mcp.mjs"
```

Check it with `codex mcp list`.

**Claude Desktop** — Settings › Developer › Edit Config, add to
`~/Library/Application Support/Claude/claude_desktop_config.json`, then restart
Claude Desktop:

```json
{
  "mcpServers": {
    "meeting-noter": {
      "command": "/Users/YOU/Library/Application Support/Meeting Noter/app/node/bin/node",
      "args": ["/Users/YOU/Library/Application Support/Meeting Noter/app/mcp/meetings-mcp.mjs"]
    }
  }
}
```

Then ask, for example: *"Search my meetings for the budget freeze and list the
action items."*

## Running from source

The installed app never builds the server: Claude Desktop's "Herstel nodig" repair only rewrites `claude_desktop_config.json`, pointing at `app/mcp/meetings-mcp.mjs` and the bundled `app/node/bin/node`. In a checkout, build the server once (and after pulling changes), then point the config at
your checkout with your own Node.js (22.13 or newer):

```bash
npm run mcp:build      # writes build/mcp/meetings-mcp.mjs
claude mcp add --scope user meeting-noter -- node "$PWD/build/mcp/meetings-mcp.mjs"
```

`--db /path/to/meetings.db` (an extra argument) or `MEETING_NOTER_DATA_DIR`
reads another database.

## How meetings get there

The app saves each change through its own API (`/api/meetings`) about a second
after it happens. The database is the archive: the browser keeps only changes
not yet saved and the meeting that is open, and fetches any other meeting from
the database when you open it. When the server is not running the changes wait
in the browser and are sent on the next start, so clearing the browser's data
loses nothing that was saved. A meeting deleted in one browser stays deleted;
another browser drops its copy instead of sending it back. On the first start
of this version the meetings already in the browser are copied into the
database once; the app confirms it with a message, once per database.

Updating or reinstalling keeps the database. `uninstall.sh` keeps it as well,
unless you run it with `--delete-meetings`.
