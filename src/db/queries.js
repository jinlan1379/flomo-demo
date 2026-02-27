// Named SQL queries for Photo Album Organizer
// These are used by the wa-sqlite Web Worker for client-side persistence.
// The server uses in-memory storage for the API.

export const queries = {
  // Photos
  insertPhoto: `INSERT OR IGNORE INTO photo (file_path, file_name, file_size, mime_type) VALUES (?, ?, ?, ?)`,
  getPhotos: `SELECT * FROM photo ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  getPhotoById: `SELECT * FROM photo WHERE id = ?`,
  getPhotoByPath: `SELECT * FROM photo WHERE file_path = ?`,
  updatePhoto: `UPDATE photo SET title = ?, description = ?, rating = ?, date_taken = ?, updated_at = datetime('now') WHERE id = ?`,
  deletePhoto: `DELETE FROM photo WHERE id = ?`,
  getPhotosByAlbum: `SELECT p.* FROM photo p JOIN photo_album pa ON p.id = pa.photo_id WHERE pa.album_id = ? ORDER BY pa.added_at DESC`,
  getPhotosByTag: `SELECT p.* FROM photo p JOIN photo_tag pt ON p.id = pt.photo_id JOIN tag t ON pt.tag_id = t.id WHERE t.name = ? COLLATE NOCASE`,
  searchPhotos: `SELECT * FROM photo WHERE title LIKE ? OR description LIKE ? OR file_name LIKE ?`,

  // Albums
  insertAlbum: `INSERT INTO album (name, description) VALUES (?, ?)`,
  getAlbums: `SELECT a.*, COUNT(pa.photo_id) as photo_count FROM album a LEFT JOIN photo_album pa ON a.id = pa.album_id GROUP BY a.id ORDER BY a.name`,
  getAlbumById: `SELECT * FROM album WHERE id = ?`,
  updateAlbum: `UPDATE album SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`,
  deleteAlbum: `DELETE FROM album WHERE id = ?`,

  // Photo-Album junction
  addPhotoToAlbum: `INSERT OR IGNORE INTO photo_album (photo_id, album_id) VALUES (?, ?)`,
  removePhotoFromAlbum: `DELETE FROM photo_album WHERE photo_id = ? AND album_id = ?`,

  // Tags
  insertTag: `INSERT OR IGNORE INTO tag (name) VALUES (?)`,
  getTags: `SELECT t.*, COUNT(pt.photo_id) as photo_count FROM tag t LEFT JOIN photo_tag pt ON t.id = pt.tag_id GROUP BY t.id ORDER BY t.name`,
  getTagByName: `SELECT * FROM tag WHERE name = ? COLLATE NOCASE`,

  // Photo-Tag junction
  addTagToPhoto: `INSERT OR IGNORE INTO photo_tag (photo_id, tag_id) VALUES (?, ?)`,
  removeTagFromPhoto: `DELETE FROM photo_tag WHERE photo_id = ? AND tag_id = ?`,
  getTagsForPhoto: `SELECT t.* FROM tag t JOIN photo_tag pt ON t.id = pt.tag_id WHERE pt.photo_id = ?`,
};
