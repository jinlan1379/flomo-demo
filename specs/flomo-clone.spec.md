# Spec: Flomo-style Web Note Application

## Overview

A lightweight, web-based note-taking application inspired by Flomo.
Users can quickly capture thoughts, attach tags, images, links, and audio,
then browse and search their notes from a clean two-column layout.

---

## Target Users

Individual users who want a low-friction tool to record fleeting ideas,
organized by tags and filterable by content type.

---

## Pages & Layout

### 1. Login Page (`/login`)

**Fields**
- 手机号 / 邮箱 (Phone or email) — text input
- 密码 (Password) — password input
- 登录 button (primary, full-width)

**Links**
- 忘记密码 → `/forgot-password` (bottom-left)
- 立即注册 → `/register` (bottom-right)

---

### 2. Register Page (`/register`)

**Fields**
- 中国大陆手机号，或邮箱 — text input
- 验证码 + 获取验证码 button (60s cooldown)
- 昵称 — text input
- 密码 — password input (min 8 chars)
- 再次输入密码 — confirm password

**Actions**
- 确定 button — submit registration
- 我已阅读并同意 [用户协议] 和 [隐私政策] — required checkbox
- 返回登录 → `/login`

---

### 3. Main Notes Page (`/`) — Authenticated

Two-column layout: fixed left sidebar + scrollable note feed.

#### Left Sidebar

**User header**
- Display name + badge (e.g. PRO)

**Stats bar**
- 笔记 count · 标签 count · 连续记录天数

**Activity heatmap**
- Calendar grid (last ~16 weeks), cell color = note count that day

**Navigation**
- 全部笔记 — show all notes (default)
  - 无标签 — notes with no tags
  - 有图片 — notes containing images
  - 有链接 — notes containing links
  - 有语音 — notes containing audio
- 每日回顾 — random notes from the same date in past years
- 随机漫步 — open a random note
- 全部标签 — flat list of all tags (# tagname), click to filter

**Bottom items**
- 回收站 — deleted notes

---

## Modules

---

### Module 1 · User

#### 1.1 Register
- Input: phone/email, verification code, nickname, password
- Validation: phone format or email format; password ≥ 8 chars; passwords match; checkbox checked
- On success: auto-login → redirect to `/`

#### 1.2 Login
- Input: phone/email + password
- On success: store session token → redirect to `/`
- On failure: show inline error message

#### 1.3 Logout
- "退出登录" option in user menu (top-left avatar/name area)
- Clear session → redirect to `/login`

#### Data Model — User
```
User {
  id:           string   (UUID)
  nickname:     string
  account:      string   (phone or email, unique)
  passwordHash: string
  createdAt:    timestamp
}
```

---

### Module 2 · Notes

#### 2.1 Create Note

The input area sits at the top of the note feed.

**Toolbar buttons** (left to right)
| Button | Action |
|--------|--------|
| `#`    | Open tag picker / type new tag inline |
| 🖼     | Upload image attachment |
| `Aa`   | Toggle rich-text toolbar (bold / underline / highlight) |
| `≡`    | Ordered list |
| `≡`    | Unordered list |
| `\|`   | Separator |
| `@`    | Reference another note by keyword search |
| ➤      | Submit note |

**Rich-text formatting** (shown when Aa is active)
- **Bold** — `Ctrl/Cmd+B`
- _Underline_ — `Ctrl/Cmd+U`
- ==Highlight== — yellow background mark
- These can be applied to selected text before or after typing.

**@ Mention**
- Typing `@` opens an inline search dropdown of existing notes
- Selecting a result inserts a clickable reference link to that note

**Tag inline**
- Typing `#` in the body OR clicking the `#` button opens tag autocomplete
- Selecting or confirming creates/applies the tag and renders it as a chip in the note

**Submission rules**
- Content must not be empty
- Maximum 1 audio attachment per note
- Maximum 9 image attachments per note
- On submit: save note, prepend card to feed, clear input

#### 2.2 Note Card (display)

```
┌──────────────────────────────────────────┐
│ 2026-02-28  14:30:00              [···]  │  ← timestamp + overflow menu
│                                          │
│  Note content text goes here...          │
│  [image thumbnail if present]            │
│  🔗 https://example.com (link preview)   │
│  🔊 audio player bar (if audio)          │
│                                          │
│  #tag1  #tag2                            │  ← tag chips
└──────────────────────────────────────────┘
```

Overflow menu (`···`) options:
- 编辑 — open note in edit mode
- 删除 — move to recycle bin (confirm dialog)
- 复制内容 — copy plain text to clipboard

#### 2.3 Note Types (auto-detected for sidebar filter)

| Filter label | Condition |
|---|---|
| 无标签 | note.tags is empty |
| 有图片 | note has ≥ 1 image attachment |
| 有链接 | note content contains a URL |
| 有语音 | note has 1 audio attachment |

A note can satisfy multiple type conditions simultaneously.

#### 2.4 Edit Note
- Click 编辑 in overflow menu
- Note card becomes inline editable with the same toolbar
- Save / Cancel buttons appear

#### Data Model — Note
```
Note {
  id:          string    (UUID)
  userId:      string
  content:     string    (HTML or markdown)
  tags:        string[]
  images:      string[]  (file paths / URLs)
  audioUrl:    string?
  links:       string[]  (auto-extracted from content)
  refs:        string[]  (note IDs referenced via @)
  deleted:     boolean
  deletedAt:   timestamp?
  createdAt:   timestamp
  updatedAt:   timestamp
}
```

---

### Module 3 · Tags

- Tags are created inline when writing a note (`#tagname`)
- Tag names are case-insensitive, stored lowercase, displayed as entered
- Max 32 characters per tag
- Clicking a tag in the sidebar filters the feed to notes with that tag
- The sidebar tag list shows all distinct tags used across non-deleted notes
- Deleting the last note with a tag removes that tag from the list

---

### Module 4 · Search

**Trigger**: search icon (`⌘+K`) or clicking the search bar in the header

**Behavior**
- Full-text search across note content
- Filter by tag: entering `#tagname` in the search box narrows to that tag
- Results shown in a modal or replace the main feed
- Matches highlighted in results
- Empty query clears the filter and returns to full feed

---

### Module 5 · Recycle Bin (`/trash`)

- Lists all notes where `deleted = true`, sorted by `deletedAt` desc
- Each card shows: content preview, deletion date, two actions:
  - 恢复 — restore note (set `deleted = false`, remove from trash view)
  - 彻底删除 — permanently delete (confirm dialog)
- 清空回收站 button — permanently deletes all trashed notes (confirm dialog)
- Notes in the recycle bin are excluded from the main feed and search

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns session token |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/send-code` | Send verification code |

### Notes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes` | List notes (supports `?tag=`, `?type=`, `?q=`, `?page=`, `?limit=`) |
| POST | `/api/notes` | Create note |
| PATCH | `/api/notes/:id` | Update note content/tags |
| DELETE | `/api/notes/:id` | Soft-delete (move to trash) |
| GET | `/api/notes/trash` | List trashed notes |
| POST | `/api/notes/:id/restore` | Restore from trash |
| DELETE | `/api/notes/:id/permanent` | Permanently delete |
| DELETE | `/api/notes/trash` | Empty recycle bin |

### Tags
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tags` | List all tags with note counts |

### Uploads
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload/image` | Upload image, returns URL |
| POST | `/api/upload/audio` | Upload audio file, returns URL |

---

## Non-Functional Requirements

- **Stack**: Node.js + Express backend; Vite + vanilla JS frontend
- **Auth**: JWT stored in `httpOnly` cookie; 7-day expiry
- **Storage**: SQLite (via better-sqlite3) for data; local `uploads/` for files
- **Performance**: Note list renders within 200ms for up to 10,000 notes
- **Responsive**: Desktop-first; mobile layout collapses sidebar into a drawer
- **Theme**: Dark mode only (matching Flomo's dark palette: `#1a1a1a` background, `#2d5a3d` accent)
