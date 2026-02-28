/**
 * Integration tests for the Note Tag feature.
 *
 * These tests import the Express `app` directly and spin up a temporary
 * HTTP server on a random port for each test suite, using Node's built-in
 * `fetch` (Node 18+).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { app, noteTags, resetNoteStore } from '../../server.js';

let server;
let base;

beforeAll(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

beforeEach(() => {
  resetNoteStore();
});

// --- Helper ---
async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${base}${path}`, opts);
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, body: data };
}

// ─── POST /api/notes ────────────────────────────────────────────────────────

describe('POST /api/notes', () => {
  it('creates a note and returns 201', async () => {
    const { status, body } = await req('POST', '/notes', {
      content: 'Hello world',
      tags: ['test'],
    });
    expect(status).toBe(201);
    expect(body.id).toMatch(/^n_/);
    expect(body.content).toBe('Hello world');
    expect(body.tags).toEqual(['test']);
    expect(body.createdAt).toBeTruthy();
    expect(body.updatedAt).toBeTruthy();
  });

  it('returns 400 when content is missing', async () => {
    const { status, body } = await req('POST', '/notes', { tags: [] });
    expect(status).toBe(400);
    expect(body.error).toMatch(/content/i);
  });

  it('returns 400 when content is empty string', async () => {
    const { status, body } = await req('POST', '/notes', { content: '   ' });
    expect(status).toBe(400);
    expect(body.error).toMatch(/content/i);
  });

  it('normalizes tags to lowercase', async () => {
    const { body } = await req('POST', '/notes', {
      content: 'Normalize test',
      tags: ['Work', 'TODO', 'Idea'],
    });
    expect(body.tags).toEqual(['work', 'todo', 'idea']);
  });

  it('deduplicates tags silently', async () => {
    const { body } = await req('POST', '/notes', {
      content: 'Dedup test',
      tags: ['work', 'Work', 'WORK'],
    });
    expect(body.tags).toEqual(['work']);
  });

  it('returns 400 when more than 10 tags are provided', async () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    const { status, body } = await req('POST', '/notes', { content: 'Too many', tags });
    expect(status).toBe(400);
    expect(body.error).toMatch(/tag limit/i);
  });
});

// ─── GET /api/notes ──────────────────────────────────────────────────────────

describe('GET /api/notes', () => {
  beforeEach(async () => {
    await req('POST', '/notes', { content: 'Note one', tags: ['work', 'urgent'] });
    await req('POST', '/notes', { content: 'Note two', tags: ['work'] });
    await req('POST', '/notes', { content: 'Note three', tags: ['personal'] });
  });

  it('returns all notes when no filter', async () => {
    const { status, body } = await req('GET', '/notes');
    expect(status).toBe(200);
    expect(body.notes.length).toBe(3);
    expect(body.total).toBe(3);
  });

  it('filters notes by tag', async () => {
    const { body } = await req('GET', '/notes?tag=work');
    expect(body.notes.length).toBe(2);
    expect(body.notes.every(n => n.tags.includes('work'))).toBe(true);
  });

  it('returns empty array for unknown tag', async () => {
    const { body } = await req('GET', '/notes?tag=nonexistent');
    expect(body.notes).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('filters by tag case-insensitively', async () => {
    const { body } = await req('GET', '/notes?tag=WORK');
    expect(body.notes.length).toBe(2);
  });

  it('searches note content', async () => {
    const { body } = await req('GET', '/notes?search=one');
    expect(body.notes.length).toBe(1);
    expect(body.notes[0].content).toBe('Note one');
  });

  it('paginates results', async () => {
    const { body } = await req('GET', '/notes?page=1&limit=2');
    expect(body.notes.length).toBe(2);
    expect(body.total).toBe(3);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
  });
});

// ─── PATCH /api/notes/:id ───────────────────────────────────────────────────

describe('PATCH /api/notes/:id', () => {
  it('updates note content', async () => {
    const created = (await req('POST', '/notes', { content: 'Original' })).body;
    const { status, body } = await req('PATCH', `/notes/${created.id}`, { content: 'Updated' });
    expect(status).toBe(200);
    expect(body.content).toBe('Updated');
  });

  it('returns 404 for unknown id', async () => {
    const { status } = await req('PATCH', '/notes/n_zzzzzz', { content: 'x' });
    expect(status).toBe(404);
  });
});

// ─── DELETE /api/notes/:id ───────────────────────────────────────────────────

describe('DELETE /api/notes/:id', () => {
  it('deletes a note and returns 204', async () => {
    const created = (await req('POST', '/notes', { content: 'To delete' })).body;
    const { status } = await req('DELETE', `/notes/${created.id}`);
    expect(status).toBe(204);
    // Should no longer appear in list
    const { body } = await req('GET', '/notes');
    expect(body.notes.find(n => n.id === created.id)).toBeUndefined();
  });

  it('removes note id from tag index on delete', async () => {
    const created = (await req('POST', '/notes', { content: 'Tagged', tags: ['alpha'] })).body;
    await req('DELETE', `/notes/${created.id}`);
    expect(noteTags.has('alpha')).toBe(false);
  });
});

// ─── POST /api/notes/:id/tags ────────────────────────────────────────────────

describe('POST /api/notes/:id/tags', () => {
  it('adds tags to a note', async () => {
    const note = (await req('POST', '/notes', { content: 'Tag me' })).body;
    const { status, body } = await req('POST', `/notes/${note.id}/tags`, { tags: ['idea', 'urgent'] });
    expect(status).toBe(200);
    expect(body.tags).toContain('idea');
    expect(body.tags).toContain('urgent');
  });

  it('normalizes added tags to lowercase', async () => {
    const note = (await req('POST', '/notes', { content: 'Case test' })).body;
    const { body } = await req('POST', `/notes/${note.id}/tags`, { tags: ['MyTag'] });
    expect(body.tags).toContain('mytag');
    expect(body.tags).not.toContain('MyTag');
  });

  it('deduplicates: adding existing tag is a no-op', async () => {
    const note = (await req('POST', '/notes', { content: 'Dedup', tags: ['alpha'] })).body;
    const { body } = await req('POST', `/notes/${note.id}/tags`, { tags: ['alpha', 'Alpha'] });
    expect(body.tags.filter(t => t === 'alpha').length).toBe(1);
  });

  it('returns 400 when adding would exceed 10 tags', async () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    const note = (await req('POST', '/notes', { content: 'Full', tags })).body;
    const { status, body } = await req('POST', `/notes/${note.id}/tags`, { tags: ['overflow'] });
    expect(status).toBe(400);
    expect(body.error).toMatch(/tag limit/i);
  });

  it('returns 404 for unknown note', async () => {
    const { status } = await req('POST', '/notes/n_zzzzzz/tags', { tags: ['x'] });
    expect(status).toBe(404);
  });
});

// ─── DELETE /api/notes/:id/tags/:tag ────────────────────────────────────────

describe('DELETE /api/notes/:id/tags/:tag', () => {
  it('removes a tag from a note', async () => {
    const note = (await req('POST', '/notes', { content: 'Remove tag', tags: ['keep', 'remove'] })).body;
    const { status, body } = await req('DELETE', `/notes/${note.id}/tags/remove`);
    expect(status).toBe(200);
    expect(body.tags).toEqual(['keep']);
  });

  it('returns 404 when tag is not on the note', async () => {
    const note = (await req('POST', '/notes', { content: 'No such tag', tags: ['only'] })).body;
    const { status, body } = await req('DELETE', `/notes/${note.id}/tags/nope`);
    expect(status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('handles URL-encoded tag names', async () => {
    const note = (await req('POST', '/notes', { content: 'Encoded', tags: ['c++'] })).body;
    // 'c++' normalized to 'c++' (lowercased), encoded as 'c%2B%2B'
    const { status, body } = await req('DELETE', `/notes/${note.id}/tags/${encodeURIComponent('c++')}`);
    expect(status).toBe(200);
    expect(body.tags).not.toContain('c++');
  });
});

// ─── GET /api/tags ───────────────────────────────────────────────────────────

describe('GET /api/tags', () => {
  it('returns noteCount and photoCount for each tag', async () => {
    await req('POST', '/notes', { content: 'A', tags: ['work', 'todo'] });
    await req('POST', '/notes', { content: 'B', tags: ['work'] });

    const { status, body } = await req('GET', '/tags');
    expect(status).toBe(200);

    const workTag = body.tags.find(t => t.name === 'work');
    expect(workTag).toBeDefined();
    expect(workTag.noteCount).toBe(2);
    expect(workTag.photoCount).toBeDefined();

    const todoTag = body.tags.find(t => t.name === 'todo');
    expect(todoTag.noteCount).toBe(1);
  });

  it('tag count decreases after note deletion', async () => {
    const note = (await req('POST', '/notes', { content: 'C', tags: ['temp'] })).body;
    await req('DELETE', `/notes/${note.id}`);

    const { body } = await req('GET', '/tags');
    const tempTag = body.tags.find(t => t.name === 'temp');
    expect(tempTag).toBeUndefined();
  });
});
