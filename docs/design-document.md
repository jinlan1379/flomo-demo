# Software Design Document: Note Tag Feature

**Feature:** Note Tag
**Spec:** `specs/note-tag.spec.md`
**Date:** 2026-02-28
**Status:** Draft

---

## Table of Contents

1. [System Overview and Goals](#1-system-overview-and-goals)
2. [Architecture Design and Component Breakdown](#2-architecture-design-and-component-breakdown)
3. [API / Interface Definitions](#3-api--interface-definitions)
4. [Data Models and Schemas](#4-data-models-and-schemas)
5. [Implementation Roadmap and Task Breakdown](#5-implementation-roadmap-and-task-breakdown)

---

## 1. System Overview and Goals

### 1.1 Context

Flomo-demo is a local-first web application currently serving as a photo album organizer. It uses an Express.js backend with in-memory storage, a Vite-bundled vanilla JavaScript frontend, and a component-based architecture with direct DOM manipulation.

This feature adds a **Notes module** with a **tagging system** that allows users to create plain-text notes, attach free-form tags, and filter notes by tag from a persistent sidebar.

### 1.2 Goals

| Goal | Description |
|------|-------------|
| **G1 — Tag Attachment** | Users can attach up to 10 tags (max 32 chars each) to any note when creating or editing it. |
| **G2 — Inline Tag Creation** | Tags can be typed directly into a chip-style input without a separate create step. |
| **G3 — Tag Removal** | Users can remove any tag from a note at any time. |
| **G4 — Tag Discovery** | A sidebar lists all distinct tags across all notes with usage counts. |
| **G5 — Tag-Based Filtering** | Clicking a sidebar tag filters the visible note list to notes carrying that tag. |
| **G6 — Performance** | Tag lookup and note filtering complete within 100 ms for up to 10,000 notes. |

### 1.3 Non-Goals

- Hierarchical / nested tags (e.g., `work/project-a`)
- Tag colors or icons
- Multi-tag AND/OR filter combinations (single active tag filter only)
- Tag renaming or global tag deletion
- Persistence across server restarts (in-memory backend, consistent with existing architecture)

### 1.4 Design Principles

- **Reuse existing patterns** — follow the same component, API, and state conventions already used for photos and albums.
- **Case-insensitive, lowercase-stored** — tags are normalized to lowercase at write time; the original casing entered by the user is not preserved.
- **Fail-safe constraints** — the 10-tag limit and 32-character limit are enforced server-side; the UI also enforces them to give immediate feedback.

---

## 2. Architecture Design and Component Breakdown

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (Frontend)                  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │TagSidebar│  │ NoteList │  │NoteEditor│  │TagInput│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │              │             │       │
│  ┌────▼──────────────▼──────────────▼─────────────▼───┐  │
│  │                  main.js (App State)                │  │
│  └────────────────────────┬────────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────▼────────────────────────────┐  │
│  │                 api.js (HTTP Client)                │  │
│  └────────────────────────┬────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼─────────────────────────────┐
│                    Express Backend (server.js)           │
│                                                         │
│  Notes Router          Tags Router                      │
│  /api/notes/*          /api/tags                        │
│  /api/notes/:id/tags/* /api/notes/:id/tags/*            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           In-Memory Store (notes, tags)          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Frontend Component Breakdown

#### 2.2.1 `src/components/tag-input.js` (extend existing)

The existing `tag-input.js` is built for photo tags. It will be **extended** to be generic (note-agnostic) so the same component works for both notes and photos.

**Responsibilities:**
- Render a chip-style text input.
- Show autocomplete suggestions from existing tags as the user types.
- Validate input: max 32 characters, max 10 tags total.
- Emit `tag:add` and `tag:remove` custom events consumed by the parent component.

**Props / Config:**
```js
createTagInput({
  existingTags: string[],   // tags already on the note
  allTags: string[],        // autocomplete source (all tags in system)
  maxTags: 10,
  maxLength: 32,
  onAdd: (tag) => void,
  onRemove: (tag) => void,
})
```

#### 2.2.2 `src/components/tag-badge.js` (new)

Renders a single pill/chip for display-only contexts (note card, note header).

**Responsibilities:**
- Display a tag string inside a styled pill.
- Optionally show a remove (`×`) button (controlled by `removable` prop).
- Emit `tag:remove` when the remove button is clicked.

#### 2.2.3 `src/components/tag-sidebar.js` (new)

Collapsible sidebar panel listing all distinct tags with note counts.

**Responsibilities:**
- Fetch and display the full tag list from `GET /api/tags` on mount.
- Show count badge next to each tag.
- Highlight the currently active filter tag.
- Emit `filter:change` event when a tag is clicked (or "All Notes" is clicked to clear filter).
- Collapse/expand via a toggle button.

#### 2.2.4 `src/components/tag-filter.js` (new)

Active filter indicator shown in the note list header bar.

**Responsibilities:**
- Display "Filtered by: `<tag>`" with a clear (`×`) button when a tag filter is active.
- Hidden when no filter is active.
- Emits `filter:clear` event on dismiss.

#### 2.2.5 `src/components/note-editor.js` (new)

Form for creating and editing notes, integrating the `TagInput` component.

**Responsibilities:**
- Text area for note `content`.
- Embed `TagInput` for tag management.
- Submit creates (`POST /api/notes`) or updates (`PATCH /api/notes/:id`) the note.
- Validates content is non-empty before submit.

#### 2.2.6 `src/components/note-list.js` (new)

Renders the list of notes, respecting the active tag filter.

**Responsibilities:**
- Accepts a `notes` array and a `filterTag` string.
- Filters notes client-side by active tag.
- Renders each note as a card showing content preview and `TagBadge` chips.
- Emits `note:select` and `note:delete` events.

### 2.3 Backend Component Breakdown

All backend logic lives in `server.js`, consistent with the existing pattern.

#### 2.3.1 In-Memory Store (extend)

```js
// Existing
const photos = [];
const albums = [];
const tags = [];          // { name, photoIds[] }

// New additions
const notes = [];         // { id, content, tags[], createdAt, updatedAt }
const noteTags = new Map(); // tagName → Set<noteId>  (for O(1) filter lookup)
```

`noteTags` is a derived index maintained on every tag add/remove to satisfy the 100 ms performance requirement for up to 10,000 notes.

#### 2.3.2 Notes Router (new routes in `server.js`)

| Route | Handler |
|-------|---------|
| `GET /api/notes` | List notes, optional `?tag=` filter |
| `POST /api/notes` | Create note |
| `PATCH /api/notes/:id` | Update note content |
| `DELETE /api/notes/:id` | Delete note and clean up tag index |
| `GET /api/tags` | Extend existing handler to include note tag counts |
| `POST /api/notes/:id/tags` | Add tags to a note |
| `DELETE /api/notes/:id/tags/:tag` | Remove tag from a note |

### 2.4 State Management

App state in `main.js` is extended with a `notes` slice:

```js
const state = {
  // existing
  photos: [],
  albums: [],
  selectedAlbum: null,

  // new
  notes: [],
  allNoteTags: [],      // [{ name, count }] — populated from GET /api/tags
  activeNoteTag: null,  // currently selected tag filter
};
```

State transitions:

```
loadNotes()        → GET /api/notes          → state.notes
loadNoteTags()     → GET /api/tags           → state.allNoteTags
setNoteTagFilter() → (client-side)           → state.activeNoteTag → re-render NoteList + TagFilter
addTagToNote()     → POST /api/notes/:id/tags → reload notes + allNoteTags
removeTagFromNote()→ DELETE /api/notes/:id/tags/:tag → reload notes + allNoteTags
```

---

## 3. API / Interface Definitions

### 3.1 Notes Endpoints

#### `GET /api/notes`

List all notes, optionally filtered by tag.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `tag` | string | Filter to notes with this tag (case-insensitive) |
| `search` | string | Substring match on content |
| `sort` | `createdAt` \| `updatedAt` | Sort field (default: `createdAt`) |
| `order` | `asc` \| `desc` | Sort direction (default: `desc`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Page size, max 100 (default: 20) |

**Response `200 OK`:**
```json
{
  "notes": [
    {
      "id": "n_1a2b3c",
      "content": "Remember to refactor the auth module.",
      "tags": ["work", "todo"],
      "createdAt": "2026-02-28T10:00:00.000Z",
      "updatedAt": "2026-02-28T10:05:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

#### `POST /api/notes`

Create a new note.

**Request Body:**
```json
{
  "content": "Buy oat milk.",
  "tags": ["shopping"]
}
```

**Validation:**
- `content` — required, non-empty string
- `tags` — optional array; each tag ≤ 32 chars, max 10 items; duplicates silently deduplicated

**Response `201 Created`:**
```json
{
  "id": "n_4d5e6f",
  "content": "Buy oat milk.",
  "tags": ["shopping"],
  "createdAt": "2026-02-28T11:00:00.000Z",
  "updatedAt": "2026-02-28T11:00:00.000Z"
}
```

**Error `400 Bad Request`:**
```json
{ "error": "content is required" }
```

---

#### `PATCH /api/notes/:id`

Update the content of an existing note. Tags are managed via the tag sub-resource endpoints.

**Request Body:**
```json
{ "content": "Buy oat milk and almonds." }
```

**Response `200 OK`:** Updated note object (same shape as `POST` response).

**Error `404 Not Found`:**
```json
{ "error": "Note not found" }
```

---

#### `DELETE /api/notes/:id`

Delete a note and remove it from all tag indexes.

**Response `204 No Content`**

---

### 3.2 Note Tag Endpoints

#### `GET /api/tags`

List all tags across **both** photos and notes, with per-entity usage counts.

**Response `200 OK`:**
```json
{
  "tags": [
    { "name": "work",     "noteCount": 12, "photoCount": 3 },
    { "name": "todo",     "noteCount": 5,  "photoCount": 0 },
    { "name": "vacation", "noteCount": 0,  "photoCount": 18 }
  ]
}
```

> The `photoCount` field is added for forward compatibility. Existing callers that only read `noteCount` remain unaffected.

---

#### `POST /api/notes/:id/tags`

Add one or more tags to a note.

**Request Body:**
```json
{ "tags": ["idea", "urgent"] }
```

**Validation:**
- Each tag ≤ 32 characters
- Adding tags must not push the total beyond 10; if it would, respond `400`
- Tags are normalized to lowercase before storage

**Response `200 OK`:** Updated note object.

**Error `400 Bad Request`:**
```json
{ "error": "Tag limit exceeded: a note can have at most 10 tags" }
```

---

#### `DELETE /api/notes/:id/tags/:tag`

Remove a single tag from a note (`:tag` is the URL-encoded tag name).

**Response `200 OK`:** Updated note object.

**Error `404 Not Found`:**
```json
{ "error": "Tag 'urgent' not found on this note" }
```

---

### 3.3 Frontend JavaScript Interface

#### `api.js` additions

```js
// Notes
export const getNotes  = (params = {}) => get('/api/notes', params);
export const createNote = (body)        => post('/api/notes', body);
export const updateNote = (id, body)    => patch(`/api/notes/${id}`, body);
export const deleteNote = (id)          => del(`/api/notes/${id}`);

// Note Tags
export const getNoteTags    = ()               => get('/api/tags');
export const addNoteTags    = (noteId, tags)   => post(`/api/notes/${noteId}/tags`, { tags });
export const removeNoteTag  = (noteId, tag)    => del(`/api/notes/${noteId}/tags/${encodeURIComponent(tag)}`);
```

---

## 4. Data Models and Schemas

### 4.1 Note Object

```
Note {
  id:        string        // "n_" + 6-char nanoid, e.g. "n_a1b2c3"
  content:   string        // raw note text, non-empty
  tags:      string[]      // lowercase tag names, max 10 items
  createdAt: ISO8601 string
  updatedAt: ISO8601 string
}
```

### 4.2 Tag Object (API response shape)

```
Tag {
  name:       string   // lowercase, max 32 chars
  noteCount:  number   // notes referencing this tag
  photoCount: number   // photos referencing this tag (may be 0)
}
```

### 4.3 In-Memory Store Structures

```js
// Primary note collection
notes: Array<{
  id:        string,
  content:   string,
  tags:      string[],
  createdAt: Date,
  updatedAt: Date,
}>

// Inverted index: tag → set of note IDs (O(1) lookup)
noteTags: Map<string, Set<string>>
```

### 4.4 Tag Constraints

| Constraint | Value | Enforced |
|------------|-------|----------|
| Max tag length | 32 characters | Server + Client |
| Max tags per note | 10 | Server + Client |
| Case normalization | Stored lowercase | Server (write path) |
| Allowed characters | Any printable; leading/trailing whitespace trimmed | Server (write path) |
| Uniqueness per note | Duplicates silently deduplicated | Server (write path) |

### 4.5 ID Generation

Note IDs use the prefix `n_` followed by a 6-character random alphanumeric string (consistent with `crypto.randomUUID()` short-form already used for photos in the project), e.g.:

```js
const noteId = 'n_' + crypto.randomUUID().replace(/-/g, '').slice(0, 6);
```

---

## 5. Implementation Roadmap and Task Breakdown

### 5.1 Dependency Graph

```
T1 (Backend store + CRUD)
  └── T2 (Backend tag endpoints)
        └── T4 (api.js client layer)
              ├── T5 (NoteList + NoteEditor components)
              │     └── T7 (main.js state integration)
              │           └── T8 (TagSidebar + TagFilter)
              │                 └── T9 (End-to-end wiring)
              └── T6 (TagInput + TagBadge components)
                    └── T7
T3 (CSS / design tokens)
  └── T5, T6, T8
```

### 5.2 Task Breakdown

---

#### T1 — Backend: Note Store and CRUD Routes

**Files:** `server.js`

- Add `notes` array and `noteTags` Map to in-memory store.
- Implement `generateNoteId()` helper.
- Add route `GET /api/notes` with `tag`, `search`, `sort`, `order`, `page`, `limit` query support.
- Add route `POST /api/notes` with content validation.
- Add route `PATCH /api/notes/:id`.
- Add route `DELETE /api/notes/:id` (also cleans `noteTags` index).

**Acceptance criteria:**
- All four CRUD operations return correct HTTP status codes.
- `GET /api/notes?tag=work` returns only notes tagged `work`.
- Creating a note with no content returns `400`.

---

#### T2 — Backend: Note Tag Sub-Resource Routes

**Files:** `server.js`

- Add route `POST /api/notes/:id/tags` — validates per-tag length, total count ≤ 10, normalizes to lowercase, updates `noteTags` index.
- Add route `DELETE /api/notes/:id/tags/:tag` — removes tag from note and index.
- Extend `GET /api/tags` handler to merge note tag counts alongside existing photo tag counts.

**Acceptance criteria:**
- Adding an 11th tag returns `400` with a descriptive message.
- Tags with uppercase input are stored and returned as lowercase.
- `GET /api/tags` returns `noteCount` and `photoCount` for each tag.

---

#### T3 — Styles: Note and Tag CSS

**Files:** `src/styles/main.css`

Add CSS for:
- `.tag-badge` — pill shape, small font, uses existing CSS color variables.
- `.tag-input-container` / `.tag-chip` — chip row with inline text input.
- `.tag-sidebar` — collapsible panel; `.tag-sidebar--collapsed` modifier.
- `.tag-sidebar__item` — row with tag name and count badge; `--active` modifier for selected state.
- `.tag-filter-bar` — note list header strip showing active filter.
- `.note-card` — card layout for note list items.
- `.note-editor` — editor panel with textarea and tag input.

**Design tokens to reuse:** `--color-bg`, `--color-surface`, `--color-accent`, `--color-text-muted` (already defined in `main.css`).

---

#### T4 — Frontend: API Client Extensions

**Files:** `src/services/api.js`

Add the seven functions listed in §3.3.

**Acceptance criteria:**
- Each function calls the correct HTTP verb and path.
- Query parameters for `getNotes` are serialized via `URLSearchParams`.

---

#### T5 — Frontend: NoteList and NoteEditor Components

**Files:** `src/components/note-list.js` (new), `src/components/note-editor.js` (new)

- `NoteList(notes, filterTag)` — renders filtered note cards with tag badges; emits `note:select`, `note:delete`.
- `NoteEditor({ note, allTags, onSave, onCancel })` — textarea + embedded `TagInput`; submits via `createNote` / `updateNote`.

**Acceptance criteria:**
- NoteList renders only notes matching `filterTag` when one is set.
- NoteEditor blocks submit when content is empty.
- Tags on existing notes are pre-populated in NoteEditor on open.

---

#### T6 — Frontend: TagInput and TagBadge Components

**Files:** `src/components/tag-input.js` (extend), `src/components/tag-badge.js` (new)

- Refactor `tag-input.js` to accept an `onAdd`/`onRemove` callback interface (decoupled from photo IDs).
- Add `TagBadge(tag, { removable, onRemove })`.
- Enforce max-10 and max-32 constraints in `TagInput` UI (disable input / show inline error).

**Acceptance criteria:**
- Typing more than 32 characters is blocked in the input.
- When 10 tags are present the input is disabled with a "Max 10 tags" message.
- `TagBadge` with `removable: true` shows an `×` button that fires `onRemove`.

---

#### T7 — Frontend: State Integration in main.js

**Files:** `src/main.js`

- Extend app state with `notes`, `allNoteTags`, `activeNoteTag`.
- Implement `loadNotes()`, `loadNoteTags()`, `setNoteTagFilter(tag)`.
- Wire `addTagToNote` and `removeTagFromNote` state actions to API calls + re-render.
- Mount `NoteList`, `NoteEditor`, `TagSidebar`, `TagFilter` into the existing page layout.

**Acceptance criteria:**
- Calling `setNoteTagFilter('work')` immediately re-renders `NoteList` and `TagFilter`.
- Adding a tag re-fetches `allNoteTags` so `TagSidebar` count updates.

---

#### T8 — Frontend: TagSidebar and TagFilter Components

**Files:** `src/components/tag-sidebar.js` (new), `src/components/tag-filter.js` (new)

- `TagSidebar({ tags, activeTag, onSelect, onClear })` — renders collapsible tag list; highlights active tag.
- `TagFilter({ activeTag, onClear })` — shows dismissible filter banner; hidden when `activeTag` is null.

**Acceptance criteria:**
- Sidebar collapses/expands correctly.
- Active tag is visually distinguished from inactive tags.
- Clicking the same tag twice in the sidebar clears the filter.
- TagFilter banner is absent from the DOM (not just hidden) when no filter is active.

---

#### T9 — Integration and End-to-End Wiring

**Files:** `src/main.js`, `index.html`

- Confirm routing between note list, editor, and sidebar is correct.
- Add Notes section to main navigation / page layout if not already present.
- Smoke test all seven functional requirements from the spec manually.

**Acceptance criteria (maps to spec requirements):**

| Req | Test |
|-----|------|
| R1 — Attach tags on create/edit | Create a note with 2 tags; tags appear on card |
| R2 — Max 32 chars, case-insensitive | Input "Work" → stored as "work" |
| R3 — Max 10 tags | 10th tag accepted; 11th blocked |
| R4 — Inline tag creation | Type new tag, press Enter → tag appears without page reload |
| R5 — Remove tag | Click `×` on tag badge → tag removed from note |
| R6 — Sidebar tag list | All distinct tags listed with correct counts |
| R7 — Sidebar filter | Click "todo" in sidebar → only notes tagged "todo" shown |

---

#### T10 — Tests

**Files:** `src/tests/note-tag.test.js` (new)

Write Vitest unit tests for:
- `POST /api/notes` — happy path, missing content, tag normalization.
- `POST /api/notes/:id/tags` — tag limit enforcement, duplicate deduplication.
- `DELETE /api/notes/:id/tags/:tag` — tag not found 404.
- `GET /api/notes?tag=x` — returns only matching notes.
- `GET /api/tags` — returns merged note + photo counts.
- `TagInput` component — max-length blocking, max-count disabling (DOM unit tests).

---

### 5.3 Delivery Phases

| Phase | Tasks | Goal |
|-------|-------|------|
| **Phase 1 — Backend** | T1, T2 | All API endpoints functional and testable via curl |
| **Phase 2 — Primitives** | T3, T4, T6 | Design tokens + shared UI building blocks |
| **Phase 3 — Views** | T5, T8 | Note list, editor, sidebar, filter components |
| **Phase 4 — Integration** | T7, T9 | Full feature wired end-to-end in the app |
| **Phase 5 — Quality** | T10 | Test coverage + lint clean |

---

*End of Software Design Document*
