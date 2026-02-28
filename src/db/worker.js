// wa-sqlite Web Worker with OPFSCoopSyncVFS
// This worker provides a postMessage-based SQL query interface.

import * as SQLite from 'wa-sqlite';
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import { OPFSCoopSyncVFS } from 'wa-sqlite/src/examples/OPFSCoopSyncVFS.js';

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS photo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  title TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  rating INTEGER DEFAULT NULL CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
  date_taken TEXT DEFAULT NULL,
  file_size INTEGER DEFAULT NULL,
  width INTEGER DEFAULT NULL,
  height INTEGER DEFAULT NULL,
  mime_type TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS album (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  cover_photo_id INTEGER DEFAULT NULL REFERENCES photo(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tag (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS photo_album (
  photo_id INTEGER NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  album_id INTEGER NOT NULL REFERENCES album(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (photo_id, album_id)
);
CREATE TABLE IF NOT EXISTS photo_tag (
  photo_id INTEGER NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_photo_file_path ON photo(file_path);
CREATE INDEX IF NOT EXISTS idx_photo_rating ON photo(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_date_taken ON photo(date_taken) WHERE date_taken IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tag_name ON tag(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_photo_album_album ON photo_album(album_id);
CREATE INDEX IF NOT EXISTS idx_photo_tag_tag ON photo_tag(tag_id);
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
`;

async function init() {
  try {
    const module = await SQLiteESMFactory();
    const sqlite3 = SQLite.Factory(module);

    const vfs = await OPFSCoopSyncVFS.create('photo-organizer-vfs', module);
    sqlite3.vfs_register(vfs, true);

    db = await sqlite3.open_v2('photo_organizer.db');

    // Enable foreign keys
    await exec('PRAGMA foreign_keys = ON');

    // Execute schema
    const statements = SCHEMA.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await exec(stmt);
    }

    postMessage({ type: 'ready' });
  } catch (err) {
    postMessage({ type: 'error', error: `Init failed: ${err.message}` });
  }
}

async function exec(sql, _params = []) {
  const rows = [];
  const columns = [];
  await SQLite.exec(db, sql, (row, col) => {
    if (columns.length === 0) columns.push(...col);
    if (row) {
      const obj = {};
      col.forEach((c, i) => { obj[c] = row[i]; });
      rows.push(obj);
    }
  });
  return { rows, columns };
}

self.onmessage = async (e) => {
  const { id, type, sql, params } = e.data;

  if (type === 'init') {
    await init();
    return;
  }

  if (type === 'exec') {
    try {
      const result = await exec(sql, params);
      postMessage({ id, type: 'result', ...result });
    } catch (err) {
      postMessage({ id, type: 'error', error: err.message });
    }
    return;
  }
};
