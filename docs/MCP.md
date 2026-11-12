# Meetings for AI agents (MCP)

Meeting Noter keeps every meeting on this Mac, in

```
~/Library/Application Support/Meeting Noter/meetings.db    SQLite: meetings, segments, speakers + full-text index
~/Library/Application Support/Meeting Noter/meetings/      one Markdown file per meeting
```

The Markdown files (title, date, speakers, summary, transcript) can be read by
any tool. For AI agents there is also an MCP server that reads the same
database, read-only. It has three tools:

| Tool | What it does |
| --- | --- |
| `list_meetings` | Meetings, newest first: id, title, date, duration, speakers (`limit`, `offset`) |
| `search_meetings` | Full-text search over titles, summaries and transcripts (`query`, `limit`) |
| `get_meeting` | One meeting by `id`, as Markdown (default) or `format: "json"` |

Nothing leaves the Mac: the server talks to the agent over stdio and only opens
the database file.

## Setup

The installer ships the server as one file. Replace `YOU` with your macOS user
name (`whoami`); config files do not expand `~`.

**Claude Code** — run once in Terminal:

```bash
claude mcp add --scope user meeting-noter -- \
  "$HOME/Library/Application Support/Meeting Noter/app/node/bin/node" \
  "$HOME/Library/Application Support/Meeting Noter/app/mcp/meetings-mcp.mjs"
```

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

Build the server once (and after pulling changes), then point the config at
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
