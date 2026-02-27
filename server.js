import 'dotenv/config';
import express from 'express';
import http from 'http';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.resolve(process.env.PHOTOS_DIR || './sample-photos');
const PORT = parseInt(process.env.PORT || '5173', 10);
const HOST = process.env.HOST || '127.0.0.1';
const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json());
const httpServer = http.createServer(app);

// --- In-memory SQLite via better-sqlite3 on server side ---
// We use a simple in-memory store on the server for the MVP.
// The wa-sqlite browser worker is for client-side persistence.
// For the server API, we use a lightweight JSON-based in-memory DB.

let photos = [];
let albums = [];
let tags = [];
let photoAlbums = []; // { photo_id, album_id }
let photoTags = [];   // { photo_id, tag_id }
let nextPhotoId = 1;
let nextAlbumId = 1;
let nextTagId = 1;

function findPhoto(id) { return photos.find(p => p.id === id); }
function findAlbum(id) { return albums.find(a => a.id === id); }
function findTag(name) { return tags.find(t => t.name.toLowerCase() === name.toLowerCase()); }

function getPhotoTags(photoId) {
  const tagIds = photoTags.filter(pt => pt.photo_id === photoId).map(pt => pt.tag_id);
  return tags.filter(t => tagIds.includes(t.id)).map(t => t.name);
}

function getPhotoAlbums(photoId) {
  const albumIds = photoAlbums.filter(pa => pa.photo_id === photoId).map(pa => pa.album_id);
  return albums.filter(a => albumIds.includes(a.id)).map(a => ({ id: a.id, name: a.name }));
}

function toPhotoResponse(p) {
  return {
    ...p,
    tags: getPhotoTags(p.id),
    albums: getPhotoAlbums(p.id),
    url: `/photos/${p.file_path}`,
  };
}

// --- Photo routes ---

app.get('/api/photos', (req, res) => {
  let result = [...photos];
  const { album_id, tag, search, sort = 'date', order = 'desc', page = '1', limit = '50' } = req.query;

  if (album_id) {
    const ids = photoAlbums.filter(pa => pa.album_id === parseInt(album_id)).map(pa => pa.photo_id);
    result = result.filter(p => ids.includes(p.id));
  }
  if (tag) {
    const t = findTag(tag);
    if (t) {
      const ids = photoTags.filter(pt => pt.tag_id === t.id).map(pt => pt.photo_id);
      result = result.filter(p => ids.includes(p.id));
    } else {
      result = [];
    }
  }
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(p =>
      (p.title && p.title.toLowerCase().includes(s)) ||
      (p.description && p.description.toLowerCase().includes(s)) ||
      p.file_name.toLowerCase().includes(s)
    );
  }

  // Sort
  result.sort((a, b) => {
    let cmp = 0;
    if (sort === 'name') cmp = a.file_name.localeCompare(b.file_name);
    else if (sort === 'rating') cmp = (a.rating || 0) - (b.rating || 0);
    else cmp = (a.created_at || '').localeCompare(b.created_at || '');
    return order === 'asc' ? cmp : -cmp;
  });

  const total = result.length;
  const p = parseInt(page);
  const l = parseInt(limit);
  result = result.slice((p - 1) * l, p * l);

  res.json({ photos: result.map(toPhotoResponse), total, page: p, limit: l });
});

app.get('/api/photos/:id', (req, res) => {
  const photo = findPhoto(parseInt(req.params.id));
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  res.json(toPhotoResponse(photo));
});

app.patch('/api/photos/:id', (req, res) => {
  const photo = findPhoto(parseInt(req.params.id));
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  const { title, description, rating, date_taken } = req.body;
  if (title !== undefined) photo.title = title;
  if (description !== undefined) photo.description = description;
  if (rating !== undefined) {
    if (rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    photo.rating = rating;
  }
  if (date_taken !== undefined) photo.date_taken = date_taken;
  photo.updated_at = new Date().toISOString();
  res.json(toPhotoResponse(photo));
});

// --- Tag routes ---

app.post('/api/photos/:id/tags', (req, res) => {
  const photo = findPhoto(parseInt(req.params.id));
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  const { tags: tagNames } = req.body;
  if (!Array.isArray(tagNames)) return res.status(400).json({ error: 'tags must be an array' });

  for (const name of tagNames) {
    let tag = findTag(name);
    if (!tag) {
      tag = { id: nextTagId++, name, created_at: new Date().toISOString() };
      tags.push(tag);
    }
    if (!photoTags.find(pt => pt.photo_id === photo.id && pt.tag_id === tag.id)) {
      photoTags.push({ photo_id: photo.id, tag_id: tag.id });
    }
  }
  res.json(toPhotoResponse(photo));
});

app.delete('/api/photos/:id/tags/:tagName', (req, res) => {
  const photo = findPhoto(parseInt(req.params.id));
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  const tag = findTag(decodeURIComponent(req.params.tagName));
  if (tag) {
    photoTags = photoTags.filter(pt => !(pt.photo_id === photo.id && pt.tag_id === tag.id));
  }
  res.status(204).end();
});

app.get('/api/tags', (_req, res) => {
  const result = tags.map(t => ({
    id: t.id,
    name: t.name,
    photo_count: photoTags.filter(pt => pt.tag_id === t.id).length,
  }));
  res.json({ tags: result });
});

// --- Album routes ---

app.get('/api/albums', (_req, res) => {
  const result = albums.map(a => {
    const pIds = photoAlbums.filter(pa => pa.album_id === a.id).map(pa => pa.photo_id);
    const coverPhoto = a.cover_photo_id ? findPhoto(a.cover_photo_id) : (pIds.length ? findPhoto(pIds[0]) : null);
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      photo_count: pIds.length,
      cover_url: coverPhoto ? `/photos/${coverPhoto.file_path}` : null,
      created_at: a.created_at,
    };
  });
  res.json({ albums: result });
});

app.post('/api/albums', (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Album name is required' });
  if (albums.find(a => a.name === name)) {
    return res.status(409).json({ error: 'Album name already exists' });
  }
  const album = {
    id: nextAlbumId++,
    name: name.trim(),
    description: description || null,
    cover_photo_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  albums.push(album);
  res.status(201).json({ ...album, photo_count: 0, cover_url: null });
});

app.patch('/api/albums/:id', (req, res) => {
  const album = findAlbum(parseInt(req.params.id));
  if (!album) return res.status(404).json({ error: 'Album not found' });
  const { name, description } = req.body;
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Album name is required' });
    if (albums.find(a => a.name === name && a.id !== album.id)) {
      return res.status(409).json({ error: 'Album name already exists' });
    }
    album.name = name.trim();
  }
  if (description !== undefined) album.description = description;
  album.updated_at = new Date().toISOString();
  const pIds = photoAlbums.filter(pa => pa.album_id === album.id).map(pa => pa.photo_id);
  res.json({ ...album, photo_count: pIds.length });
});

app.delete('/api/albums/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = albums.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Album not found' });
  albums.splice(idx, 1);
  photoAlbums = photoAlbums.filter(pa => pa.album_id !== id);
  res.status(204).end();
});

app.post('/api/albums/:id/photos', (req, res) => {
  const album = findAlbum(parseInt(req.params.id));
  if (!album) return res.status(404).json({ error: 'Album not found' });
  const { photo_ids } = req.body;
  if (!Array.isArray(photo_ids)) return res.status(400).json({ error: 'photo_ids must be an array' });

  for (const pid of photo_ids) {
    if (findPhoto(pid) && !photoAlbums.find(pa => pa.photo_id === pid && pa.album_id === album.id)) {
      photoAlbums.push({ photo_id: pid, album_id: album.id });
    }
  }
  const count = photoAlbums.filter(pa => pa.album_id === album.id).length;
  res.json({ ...album, photo_count: count });
});

app.delete('/api/albums/:id/photos/:photoId', (req, res) => {
  const albumId = parseInt(req.params.id);
  const photoId = parseInt(req.params.photoId);
  photoAlbums = photoAlbums.filter(pa => !(pa.album_id === albumId && pa.photo_id === photoId));
  res.status(204).end();
});

// --- Scan endpoint ---

async function scanDirectory(dir, relativeTo) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await scanDirectory(fullPath, relativeTo));
    } else if (IMAGE_RE.test(entry.name)) {
      const relPath = path.relative(relativeTo, fullPath);
      const stats = await stat(fullPath);
      files.push({
        file_path: relPath,
        file_name: entry.name,
        file_size: stats.size,
        mime_type: getMimeType(entry.name),
      });
    }
  }
  return files;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.avif': 'image/avif',
  };
  return types[ext] || 'application/octet-stream';
}

app.post('/api/scan', async (_req, res) => {
  try {
    const scanned = await scanDirectory(PHOTOS_DIR, PHOTOS_DIR);
    const existingPaths = new Set(photos.map(p => p.file_path));
    const scannedPaths = new Set(scanned.map(f => f.file_path));

    let added = 0;
    for (const file of scanned) {
      if (!existingPaths.has(file.file_path)) {
        photos.push({
          id: nextPhotoId++,
          file_path: file.file_path,
          file_name: file.file_name,
          title: null,
          description: null,
          rating: null,
          date_taken: null,
          file_size: file.file_size,
          width: null,
          height: null,
          mime_type: file.mime_type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        added++;
      }
    }

    let removed = 0;
    const toRemove = photos.filter(p => !scannedPaths.has(p.file_path));
    for (const p of toRemove) {
      const idx = photos.indexOf(p);
      photos.splice(idx, 1);
      photoAlbums = photoAlbums.filter(pa => pa.photo_id !== p.id);
      photoTags = photoTags.filter(pt => pt.photo_id !== p.id);
      removed++;
    }

    res.json({ added, removed, total: photos.length });
  } catch (err) {
    res.status(500).json({ error: `Failed to scan directory: ${err.message}` });
  }
});

// --- Serve photos ---
app.use('/photos', express.static(PHOTOS_DIR));

// --- Vite integration ---
if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

httpServer.listen(PORT, HOST, () => {
  console.log(`Photo Album Organizer running at http://${HOST}:${PORT}`);
  console.log(`Photos directory: ${PHOTOS_DIR}`);
});
