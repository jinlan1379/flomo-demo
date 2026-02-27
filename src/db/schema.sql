-- Photo Album Organizer Schema v1

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
