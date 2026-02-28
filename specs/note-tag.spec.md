# Spec: Note Tag Feature

## Overview
Add a tagging system to notes so users can organize and filter their content.

## Requirements

### Functional Requirements
1. Users can attach one or more tags to a note when creating or editing it.
2. Tags are plain text strings, max 32 characters, case-insensitive.
3. A note can have at most 10 tags.
4. Tags can be created inline (typed directly in the tag input field).
5. Users can remove a tag from a note at any time.
6. The sidebar shows a list of all distinct tags used across notes.
7. Clicking a tag in the sidebar filters the note list to only notes with that tag.

### Data Model

```
Note {
  id: string
  content: string
  tags: string[]        // e.g. ["work", "idea", "todo"]
  createdAt: timestamp
  updatedAt: timestamp
}
```

### API

| Method | Endpoint               | Description                       |
|--------|------------------------|-----------------------------------|
| GET    | /api/tags              | List all tags with usage counts   |
| POST   | /api/notes/:id/tags    | Add tags to a note                |
| DELETE | /api/notes/:id/tags/:tag | Remove a tag from a note        |

### UI Components
- `TagInput` — chip-style input with autocomplete from existing tags
- `TagBadge` — small pill component to display a tag
- `TagSidebar` — collapsible list of all tags with counts
- `TagFilter` — active tag filter indicator in the note list header

## Non-Functional Requirements
- Tag lookup and filtering should complete within 100 ms for up to 10,000 notes.
- Tag names are stored lowercase; display as entered by user.
