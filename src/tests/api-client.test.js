/**
 * Unit tests for the api.js HTTP client.
 *
 * Mocks globalThis.fetch to verify request construction, query-string
 * building, URL encoding, and error handling — without a live server.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../services/api.js';

// Helper: create a mock fetch that resolves with a given status + JSON body.
function makeFetchMock(status, data) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(data),
  });
}

// Helper: create a 204 No Content mock.
function make204Mock() {
  return vi.fn().mockResolvedValue({ status: 204, ok: true });
}

beforeEach(() => {
  // Each test starts fresh
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── api.getNotes ─────────────────────────────────────────────────────────────

describe('api.getNotes', () => {
  it('calls GET /api/notes with no query string when params is empty', async () => {
    const mockFetch = makeFetchMock(200, { notes: [], total: 0 });
    vi.stubGlobal('fetch', mockFetch);

    await api.getNotes();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/notes');
    expect(opts.method).toBe('GET');
  });

  it('calls GET /api/notes with no query string when called with no args', async () => {
    const mockFetch = makeFetchMock(200, { notes: [] });
    vi.stubGlobal('fetch', mockFetch);

    await api.getNotes();

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('?');
  });

  it('appends non-empty params as a query string', async () => {
    const mockFetch = makeFetchMock(200, { notes: [] });
    vi.stubGlobal('fetch', mockFetch);

    await api.getNotes({ tag: 'work', page: 2, limit: 10 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('tag=work');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('skips null params', async () => {
    const mockFetch = makeFetchMock(200, { notes: [] });
    vi.stubGlobal('fetch', mockFetch);

    await api.getNotes({ tag: null, search: 'hello' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('tag=');
    expect(url).toContain('search=hello');
  });

  it('skips empty-string params', async () => {
    const mockFetch = makeFetchMock(200, { notes: [] });
    vi.stubGlobal('fetch', mockFetch);

    await api.getNotes({ tag: '', page: 1 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('tag=');
    expect(url).toContain('page=1');
  });

  it('returns the parsed JSON body', async () => {
    const payload = { notes: [{ id: 'n_abc123', content: 'Hi' }], total: 1 };
    vi.stubGlobal('fetch', makeFetchMock(200, payload));

    const result = await api.getNotes();
    expect(result).toEqual(payload);
  });
});

// ─── api.createNote ───────────────────────────────────────────────────────────

describe('api.createNote', () => {
  it('calls POST /api/notes with JSON body', async () => {
    const noteData = { content: 'Hello world', tags: ['test'] };
    const mockFetch = makeFetchMock(201, { id: 'n_abc123', ...noteData });
    vi.stubGlobal('fetch', mockFetch);

    await api.createNote(noteData);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/notes');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(noteData);
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  it('returns the created note object', async () => {
    const note = { id: 'n_abc123', content: 'Created', tags: [], createdAt: 'now', updatedAt: 'now' };
    vi.stubGlobal('fetch', makeFetchMock(201, note));

    const result = await api.createNote({ content: 'Created' });
    expect(result).toEqual(note);
  });
});

// ─── api.updateNote ───────────────────────────────────────────────────────────

describe('api.updateNote', () => {
  it('calls PATCH /api/notes/:id with JSON body', async () => {
    const mockFetch = makeFetchMock(200, { id: 'n_abc123', content: 'Updated' });
    vi.stubGlobal('fetch', mockFetch);

    await api.updateNote('n_abc123', { content: 'Updated' });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/notes/n_abc123');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ content: 'Updated' });
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  it('uses the correct note id in the URL', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    await api.updateNote('n_xyz999', { content: 'x' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/notes/n_xyz999');
  });
});

// ─── api.deleteNote ───────────────────────────────────────────────────────────

describe('api.deleteNote', () => {
  it('calls DELETE /api/notes/:id', async () => {
    const mockFetch = make204Mock();
    vi.stubGlobal('fetch', mockFetch);

    await api.deleteNote('n_abc123');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/notes/n_abc123');
    expect(opts.method).toBe('DELETE');
  });

  it('returns null for a 204 No Content response', async () => {
    vi.stubGlobal('fetch', make204Mock());

    const result = await api.deleteNote('n_abc123');
    expect(result).toBeNull();
  });

  it('sends no request body', async () => {
    const mockFetch = make204Mock();
    vi.stubGlobal('fetch', mockFetch);

    await api.deleteNote('n_abc123');

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.body).toBeUndefined();
  });
});

// ─── api.addNoteTags ──────────────────────────────────────────────────────────

describe('api.addNoteTags', () => {
  it('calls POST /api/notes/:id/tags with tags array in body', async () => {
    const mockFetch = makeFetchMock(200, { id: 'n_abc123', tags: ['a', 'b'] });
    vi.stubGlobal('fetch', mockFetch);

    await api.addNoteTags('n_abc123', ['a', 'b']);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/notes/n_abc123/tags');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ tags: ['a', 'b'] });
  });

  it('returns the updated note object', async () => {
    const updated = { id: 'n_abc123', tags: ['a', 'b'] };
    vi.stubGlobal('fetch', makeFetchMock(200, updated));

    const result = await api.addNoteTags('n_abc123', ['a', 'b']);
    expect(result).toEqual(updated);
  });
});

// ─── api.removeNoteTag ────────────────────────────────────────────────────────

describe('api.removeNoteTag', () => {
  it('calls DELETE /api/notes/:id/tags/:tag', async () => {
    const mockFetch = makeFetchMock(200, { tags: [] });
    vi.stubGlobal('fetch', mockFetch);

    await api.removeNoteTag('n_abc123', 'work');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/notes/n_abc123/tags/work');
    expect(opts.method).toBe('DELETE');
  });

  it('URL-encodes a tag with plus signs', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, { tags: [] }));

    await api.removeNoteTag('n_abc123', 'c++');

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe('/api/notes/n_abc123/tags/c%2B%2B');
  });

  it('URL-encodes spaces in tag name', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, { tags: [] }));

    await api.removeNoteTag('n_abc123', 'my tag');

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toContain('my%20tag');
  });

  it('URL-encodes a tag with slashes', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, { tags: [] }));

    await api.removeNoteTag('n_abc123', 'a/b');

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toContain('a%2Fb');
  });
});

// ─── api.getTags ──────────────────────────────────────────────────────────────

describe('api.getTags', () => {
  it('calls GET /api/tags', async () => {
    const mockFetch = makeFetchMock(200, { tags: [] });
    vi.stubGlobal('fetch', mockFetch);

    await api.getTags();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/tags');
    expect(opts.method).toBe('GET');
  });

  it('returns the tags payload', async () => {
    const payload = { tags: [{ name: 'work', noteCount: 3, photoCount: 0 }] };
    vi.stubGlobal('fetch', makeFetchMock(200, payload));

    const result = await api.getTags();
    expect(result).toEqual(payload);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('api error handling', () => {
  it('throws an error using data.error message on non-2xx response', async () => {
    vi.stubGlobal('fetch', makeFetchMock(400, { error: 'content is required' }));

    await expect(api.createNote({ tags: [] })).rejects.toThrow('content is required');
  });

  it('throws a generic message when data.error is absent', async () => {
    vi.stubGlobal('fetch', makeFetchMock(500, {}));

    await expect(api.getNotes()).rejects.toThrow('Request failed: 500');
  });

  it('throws on 404', async () => {
    vi.stubGlobal('fetch', makeFetchMock(404, { error: 'Note not found' }));

    await expect(api.updateNote('n_bad', { content: 'x' })).rejects.toThrow('Note not found');
  });

  it('throws on 409 conflict', async () => {
    vi.stubGlobal('fetch', makeFetchMock(409, { error: 'Conflict' }));

    await expect(api.createNote({ content: 'x' })).rejects.toThrow('Conflict');
  });

  it('does not throw for a 204 response (treated as success)', async () => {
    vi.stubGlobal('fetch', make204Mock());

    await expect(api.deleteNote('n_abc')).resolves.toBeNull();
  });
});
