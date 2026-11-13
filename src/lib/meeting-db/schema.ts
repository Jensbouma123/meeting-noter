export const SCHEMA_VERSION = 5;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  duration_seconds INTEGER,
  segment_count INTEGER NOT NULL DEFAULT 0,
  capture_mode TEXT,
  is_draft INTEGER NOT NULL DEFAULT 0,
  speaker_names TEXT NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '{"actions":[],"decisions":[]}',
  markdown_file TEXT,
  participants TEXT,
  folder_id TEXT
);
CREATE TABLE IF NOT EXISTS segments (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  segment_id TEXT NOT NULL,
  source TEXT NOT NULL,
  speaker_id TEXT NOT NULL,
  start_s REAL NOT NULL,
  end_s REAL NOT NULL,
  text TEXT NOT NULL,
  overlap TEXT,
  low_conf_spans TEXT,
  PRIMARY KEY (meeting_id, seq)
);
CREATE TABLE IF NOT EXISTS speakers (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  speaker_id TEXT NOT NULL,
  source TEXT NOT NULL,
  label TEXT NOT NULL,
  color_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (meeting_id, speaker_id)
);
CREATE VIRTUAL TABLE IF NOT EXISTS meetings_fts USING fts5(
  title, summary, transcript,
  tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TABLE IF NOT EXISTS deleted_meetings (
  id TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES folders(id),
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
