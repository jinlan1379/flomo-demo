/**
 * Additional edge-case tests for note/tag server routes.
 * Complements note-tag.test.js which covers the primary happy paths.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { app, notes, noteTags, resetNoteStore } from '../../server.js';

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

// ─── POST /api/notes – validation edge cases ─────────────────────────────────

describe('POST /api/notes – validation edge cases', () => {
  it('returns 400 when a tag exceeds 32 characters', async () => {
    const { status, body } = await req('POST', '/notes', {
      content: 'Test',
      tags: ['a'.repeat(33)],
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/exceeds 32 characters/i);
  });

  it('accepts a tag of exactly 32 characters (boundary)', async () => {
    const tag32 = 'a'.repeat(32);
    const { status, body } = await req('POST', '/notes', {
      content: 'Boundary test',
      tags: [tag32],
    });
    expect(status).toBe(201);
    expect(body.tags).toContain(tag32);
  });

  it('returns 400 when tags is not an array', async () => {
    const { status, body } = await req('POST', '/notes', {
      content: 'Test',
      tags: 'not-an-array',
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/tags must be an array/i);
  });

  it('creates note with no tags when tags field is omitted', async () => {
    const { status, body } = await req('POST', '/notes', { content: 'No tags' });
    expect(status).toBe(201);
    expect(body.tags).toEqual([]);
  });

  it('trims leading/trailing whitespace from content', async () => {
    const { body } = await req('POST', '/notes', { content: '  Trimmed  ' });
    expect(body.content).toBe('Trimmed');
  });

  it('filters out whitespace-only tags silently', async () => {
    const { body } = await req('POST', '/notes', {
      content: 'Whitespace tag test',
      tags: ['   ', 'valid'],
    });
    expect(body.tags).toEqual(['valid']);
  });

  it('sets createdAt and updatedAt to the same value on creation', async () => {
    const { body } = await req('POST', '/notes', { content: 'Timestamps' });
    expect(body.createdAt).toBe(body.updatedAt);
  });

  it('returns ISO-8601 timestamps', async () => {
    const { body } = await req('POST', '/notes', { content: 'Time format' });
    expect(() => new Date(body.createdAt).toISOString()).not.toThrow();
    expect(() => new Date(body.updatedAt).toISOString()).not.toThrow();
  });

  it('id follows the n_<hex> format', async () => {
    const { body } = await req('POST', '/notes', { content: 'ID format' });
    expect(body.id).toMatch(/^n_[0-9a-f]{6}$/);
  });
});

// ─── PATCH /api/notes/:id – validation edge cases ────────────────────────────

describe('PATCH /api/notes/:id – validation edge cases', () => {
  it('returns 400 when content is whitespace only', async () => {
    const { body: created } = await req('POST', '/notes', { content: 'Original' });
    const { status, body } = await req('PATCH', `/notes/${created.id}`, { content: '   ' });
    expect(status).toBe(400);
    expect(body.error).toMatch(/content cannot be empty/i);
  });

  it('trims content on update', async () => {
    const { body: created } = await req('POST', '/notes', { content: 'Original' });
    const { body } = await req('PATCH', `/notes/${created.id}`, { content: '  Trimmed  ' });
    expect(body.content).toBe('Trimmed');
  });

  it('does not change createdAt on update', async () => {
    const { body: created } = await req('POST', '/notes', { content: 'Original' });
    const { body: updated } = await req('PATCH', `/notes/${created.id}`, { content: 'Changed' });
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it('preserves tags when only content is updated', async () => {
    const { body: created } = await req('POST', '/notes', {
      content: 'Tagged note',
      tags: ['keep', 'these'],
    });
    const { body } = await req('PATCH', `/notes/${created.id}`, { content: 'Updated content' });
    expect(body.tags).toEqual(['keep', 'these']);
  });

  it('updates updatedAt after a delay from creation', async () => {
    const { body: created } = await req('POST', '/notes', { content: 'Old' });
    await new Promise(r => setTimeout(r, 10));
    const { body } = await req('PATCH', `/notes/${created.id}`, { content: 'New' });
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.createdAt).getTime()
    );
  });

  it('accepts a PATCH with no body fields and still returns 200', async () => {
    const { body: created } = await req('POST', '/notes', { content: 'Untouched' });
    const { status, body } = await req('PATCH', `/notes/${created.id}`, {});
    expect(status).toBe(200);
    expect(body.content).toBe('Untouched');
  });
});

// ─── DELETE /api/notes/:id – additional coverage ─────────────────────────────

describe('DELETE /api/notes/:id – additional coverage', () => {
  it('returns 404 for a non-existent note', async () => {
    const { status, body } = await req('DELETE', '/notes/n_doesnotexist');
    expect(status).toBe(404);
    expect(body.error).toMatch(/note not found/i);
  });

  it('removes the note from the array', async () => {
    const { body: created } = await req('POST', '/notes', { content: 'To delete' });
    await req('DELETE', `/notes/${created.id}`);
    expect(notes.find(n => n.id === created.id)).toBeUndefined();
  });

  it('removes the tag entry from noteTags Map when last note using it is deleted', async () => {
    const { body } = await req('POST', '/notes', { content: 'Solo', tags: ['solo'] });
    await req('DELETE', `/notes/${body.id}`);
    expect(noteTags.has('solo')).toBe(false);
  });

  it('keeps noteTags Map entry when other notes still use the tag', async () => {
    const { body: a } = await req('POST', '/notes', { content: 'A', tags: ['shared'] });
    const { body: b } = await req('POST', '/notes', { content: 'B', tags: ['shared'] });
    await req('DELETE', `/notes/${a.id}`);
    expect(noteTags.has('shared')).toBe(true);
    expect(noteTags.get('shared').has(b.id)).toBe(true);
  });

  it('removes note id from every tag it held in noteTags', async () => {
    const { body } = await req('POST', '/notes', {
      content: 'Multi-tag',
      tags: ['alpha', 'beta', 'gamma'],
    });
    await req('DELETE', `/notes/${body.id}`);
    expect(noteTags.has('alpha')).toBe(false);
    expect(noteTags.has('beta')).toBe(false);
    expect(noteTags.has('gamma')).toBe(false);
  });
});

// ─── POST /api/notes/:id/tags – additional validation ────────────────────────

describe('POST /api/notes/:id/tags – additional validation', () => {
  it('returns 400 when a tag exceeds 32 characters', async () => {
    const { body: note } = await req('POST', '/notes', { content: 'Test' });
    const { status, body } = await req('POST', `/notes/${note.id}/tags`, {
      tags: ['a'.repeat(33)],
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/exceeds 32 characters/i);
  });

  it('accepts a tag of exactly 32 characters (boundary)', async () => {
    const { body: note } = await req('POST', '/notes', { content: 'Boundary' });
    const tag32 = 'b'.repeat(32);
    const { status, body } = await req('POST', `/notes/${note.id}/tags`, { tags: [tag32] });
    expect(status).toBe(200);
    expect(body.tags).toContain(tag32);
  });

  it('returns 400 when tags is not an array', async () => {
    const { body: note } = await req('POST', '/notes', { content: 'Test' });
    const { status, body } = await req('POST', `/notes/${note.id}/tags`, { tags: 'invalid' });
    expect(status).toBe(400);
    expect(body.error).toMatch(/tags must be an array/i);
  });

  it('updates updatedAt after adding tags', async () => {
    const { body: note } = await req('POST', '/notes', { content: 'Tagged' });
    await new Promise(r => setTimeout(r, 10));
    const { body } = await req('POST', `/notes/${note.id}/tags`, { tags: ['newtag'] });
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
      new Date(note.updatedAt).getTime()
    );
  });

  it('updates noteTags index when a new tag is added', async () => {
    const { body: note } = await req('POST', '/notes', { content: 'Index test' });
    await req('POST', `/notes/${note.id}/tags`, { tags: ['indexed'] });
    expect(noteTags.has('indexed')).toBe(true);
    expect(noteTags.get('indexed').has(note.id)).toBe(true);
  });

  it('adding an empty string tag after normalization is a no-op', async () => {
    const { body: note } = await req('POST', '/notes', { content: 'Empty tag' });
    const { body } = await req('POST', `/notes/${note.id}/tags`, { tags: ['   '] });
    expect(body.tags).toEqual([]);
  });
});

// ─── DELETE /api/notes/:id/tags/:tag – additional coverage ───────────────────

describe('DELETE /api/notes/:id/tags/:tag – additional coverage', () => {
  it('updates updatedAt when a tag is removed', async () => {
    const { body: note } = await req('POST', '/notes', {
      content: 'Tagged',
      tags: ['removable'],
    });
    await new Promise(r => setTimeout(r, 10));
    const { body } = await req('DELETE', `/notes/${note.id}/tags/removable`);
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
      new Date(note.updatedAt).getTime()
    );
  });

  it('removes the tag from noteTags index', async () => {
    const { body: note } = await req('POST', '/notes', {
      content: 'Cleanup',
      tags: ['cleanup'],
    });
    await req('DELETE', `/notes/${note.id}/tags/cleanup`);
    expect(noteTags.has('cleanup')).toBe(false);
  });

  it('returns 404 for a non-existent note', async () => {
    const { status } = await req('DELETE', '/notes/n_notreal/tags/sometag');
    expect(status).toBe(404);
  });

  it('is case-insensitive: deleting uppercase form removes lowercase stored tag', async () => {
    const { body: note } = await req('POST', '/notes', {
      content: 'Case delete',
      tags: ['mytag'],
    });
    const { status, body } = await req('DELETE', `/notes/${note.id}/tags/MYTAG`);
    expect(status).toBe(200);
    expect(body.tags).not.toContain('mytag');
  });
});

// ─── GET /api/notes – sorting, pagination, and combined filters ───────────────

describe('GET /api/notes – sorting, pagination, and combined filters', () => {
  beforeEach(async () => {
    await req('POST', '/notes', { content: 'Alpha note' });
    await req('POST', '/notes', { content: 'Beta note' });
    await req('POST', '/notes', { content: 'Gamma note' });
    await req('POST', '/notes', { content: 'Delta note' });
  });

  it('defaults to descending createdAt order', async () => {
    const { body } = await req('GET', '/notes');
    const dates = body.notes.map(n => n.createdAt);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it('supports ascending order via ?order=asc', async () => {
    const { body } = await req('GET', '/notes?order=asc');
    const dates = body.notes.map(n => n.createdAt);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('returns correct notes on page 2', async () => {
    const p1 = (await req('GET', '/notes?page=1&limit=2')).body;
    const p2 = (await req('GET', '/notes?page=2&limit=2')).body;
    expect(p1.notes.length).toBe(2);
    expect(p2.notes.length).toBe(2);
    expect(p1.notes[0].id).not.toBe(p2.notes[0].id);
    expect(p2.page).toBe(2);
    expect(p2.total).toBe(4);
  });

  it('returns empty notes array for page beyond total', async () => {
    const { body } = await req('GET', '/notes?page=99&limit=10');
    expect(body.notes).toEqual([]);
    expect(body.total).toBe(4);
  });

  it('caps limit at 100', async () => {
    const { body } = await req('GET', '/notes?limit=200');
    expect(body.limit).toBe(100);
  });

  it('applies tag AND search filters simultaneously', async () => {
    resetNoteStore();
    await req('POST', '/notes', { content: 'Meeting recap', tags: ['work'] });
    await req('POST', '/notes', { content: 'Personal recap', tags: ['work'] });
    await req('POST', '/notes', { content: 'Meeting summary', tags: ['personal'] });

    const { body } = await req('GET', '/notes?tag=work&search=meeting');
    expect(body.notes.length).toBe(1);
    expect(body.notes[0].content).toBe('Meeting recap');
  });

  it('search is case-insensitive', async () => {
    resetNoteStore();
    await req('POST', '/notes', { content: 'CaseSensitiveContent' });
    const { body } = await req('GET', '/notes?search=casesensitive');
    expect(body.notes.length).toBe(1);
  });

  it('sorts by updatedAt when sort=updatedAt', async () => {
    resetNoteStore();
    const { body: a } = await req('POST', '/notes', { content: 'Older note' });
    await req('POST', '/notes', { content: 'Newer note' });
    await new Promise(r => setTimeout(r, 10));
    // Edit the first note so it has the most recent updatedAt
    await req('PATCH', `/notes/${a.id}`, { content: 'Older note (edited)' });

    const { body } = await req('GET', '/notes?sort=updatedAt&order=desc');
    expect(body.notes[0].id).toBe(a.id);
  });

  it('total field reflects pre-pagination count', async () => {
    const { body } = await req('GET', '/notes?page=1&limit=1');
    expect(body.total).toBe(4);
    expect(body.notes.length).toBe(1);
  });
});

// ─── GET /api/tags – note tag counts ─────────────────────────────────────────

describe('GET /api/tags – note tag counts', () => {
  it('returns empty tags array when no notes or photos exist', async () => {
    const { body } = await req('GET', '/tags');
    expect(body.tags).toEqual([]);
  });

  it('includes note-only tags with noteCount and photoCount=0', async () => {
    await req('POST', '/notes', { content: 'Test', tags: ['note-only'] });
    const { body } = await req('GET', '/tags');
    const tag = body.tags.find(t => t.name === 'note-only');
    expect(tag).toBeDefined();
    expect(tag.noteCount).toBe(1);
    expect(tag.photoCount).toBe(0);
  });

  it('aggregates noteCount across multiple notes with same tag', async () => {
    await req('POST', '/notes', { content: 'A', tags: ['multi'] });
    await req('POST', '/notes', { content: 'B', tags: ['multi'] });
    await req('POST', '/notes', { content: 'C', tags: ['other'] });

    const { body } = await req('GET', '/tags');
    const multiTag = body.tags.find(t => t.name === 'multi');
    expect(multiTag.noteCount).toBe(2);

    const otherTag = body.tags.find(t => t.name === 'other');
    expect(otherTag.noteCount).toBe(1);
  });

  it('removes tag from results after all notes with it are deleted', async () => {
    const { body: n1 } = await req('POST', '/notes', { content: 'A', tags: ['ephemeral'] });
    const { body: n2 } = await req('POST', '/notes', { content: 'B', tags: ['ephemeral'] });
    await req('DELETE', `/notes/${n1.id}`);
    await req('DELETE', `/notes/${n2.id}`);

    const { body } = await req('GET', '/tags');
    expect(body.tags.find(t => t.name === 'ephemeral')).toBeUndefined();
  });

  it('decreases noteCount after removing tag from note via sub-route', async () => {
    const { body: note } = await req('POST', '/notes', {
      content: 'Test',
      tags: ['counted'],
    });
    await req('DELETE', `/notes/${note.id}/tags/counted`);

    const { body } = await req('GET', '/tags');
    expect(body.tags.find(t => t.name === 'counted')).toBeUndefined();
  });
});

// ─── noteTags index invariants ────────────────────────────────────────────────

describe('noteTags index invariants', () => {
  it('is empty after resetting the store', () => {
    resetNoteStore();
    expect(noteTags.size).toBe(0);
  });

  it('correctly indexes a note with multiple tags', async () => {
    const { body } = await req('POST', '/notes', {
      content: 'Multi-tag',
      tags: ['a', 'b', 'c'],
    });
    expect(noteTags.get('a').has(body.id)).toBe(true);
    expect(noteTags.get('b').has(body.id)).toBe(true);
    expect(noteTags.get('c').has(body.id)).toBe(true);
  });

  it('index size matches unique tags across all notes', async () => {
    await req('POST', '/notes', { content: 'N1', tags: ['x', 'y'] });
    await req('POST', '/notes', { content: 'N2', tags: ['y', 'z'] });
    // Unique tags: x, y, z
    expect(noteTags.size).toBe(3);
  });
});
