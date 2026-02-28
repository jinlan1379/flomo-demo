// @vitest-environment happy-dom
/**
 * Unit tests for new frontend UI components.
 *
 * Uses the happy-dom environment so all standard DOM APIs are available.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTagBadge } from '../components/tag-badge.js';
import { renderTagFilter } from '../components/tag-filter.js';
import { renderTagSidebar } from '../components/tag-sidebar.js';
import { renderNoteList } from '../components/note-list.js';
import { createTagInput } from '../components/tag-input.js';

// ─── createTagBadge ───────────────────────────────────────────────────────────

describe('createTagBadge', () => {
  it('returns a <span> element with class tag-badge', () => {
    const el = createTagBadge('work');
    expect(el.tagName).toBe('SPAN');
    expect(el.classList.contains('tag-badge')).toBe(true);
  });

  it('sets data-tag attribute to the tag name', () => {
    const el = createTagBadge('urgent');
    expect(el.dataset.tag).toBe('urgent');
  });

  it('sets text content to the tag name', () => {
    const el = createTagBadge('idea');
    expect(el.textContent).toBe('idea');
  });

  it('does not render a remove button when removable is false (default)', () => {
    const el = createTagBadge('noop');
    expect(el.querySelector('.tag-badge-remove')).toBeNull();
  });

  it('renders a remove button when removable is true', () => {
    const el = createTagBadge('mytag', { removable: true, onRemove: () => {} });
    expect(el.querySelector('.tag-badge-remove')).not.toBeNull();
  });

  it('remove button has an aria-label that mentions the tag name', () => {
    const el = createTagBadge('aria-tag', { removable: true, onRemove: () => {} });
    const btn = el.querySelector('.tag-badge-remove');
    expect(btn.getAttribute('aria-label')).toContain('aria-tag');
  });

  it('remove button has a title attribute', () => {
    const el = createTagBadge('titled', { removable: true, onRemove: () => {} });
    const btn = el.querySelector('.tag-badge-remove');
    expect(btn.title).toBeTruthy();
  });

  it('clicking the remove button calls onRemove with the tag name', () => {
    const onRemove = vi.fn();
    const el = createTagBadge('click-me', { removable: true, onRemove });
    el.querySelector('.tag-badge-remove').click();
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith('click-me');
  });

  it('clicking the remove button does not propagate to the parent element', () => {
    const parentHandler = vi.fn();
    const container = document.createElement('div');
    container.addEventListener('click', parentHandler);
    const el = createTagBadge('stop-prop', { removable: true, onRemove: () => {} });
    container.appendChild(el);
    el.querySelector('.tag-badge-remove').click();
    expect(parentHandler).not.toHaveBeenCalled();
  });

  it('does not throw when onRemove is not provided and removable is true', () => {
    const el = createTagBadge('no-handler', { removable: true });
    expect(() => el.querySelector('.tag-badge-remove').click()).not.toThrow();
  });
});

// ─── renderTagFilter ──────────────────────────────────────────────────────────

describe('renderTagFilter', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('does not insert any element when activeTag is null', () => {
    renderTagFilter(container, { activeTag: null, onClear: () => {} });
    expect(container.querySelector('.tag-filter-bar')).toBeNull();
    expect(container.childElementCount).toBe(0);
  });

  it('creates a .tag-filter-bar when activeTag is a non-empty string', () => {
    renderTagFilter(container, { activeTag: 'work', onClear: () => {} });
    expect(container.querySelector('.tag-filter-bar')).not.toBeNull();
  });

  it('displays the active tag name in the filter bar', () => {
    renderTagFilter(container, { activeTag: 'urgent', onClear: () => {} });
    expect(container.querySelector('.tag-filter-bar').textContent).toContain('urgent');
  });

  it('inserts the filter bar as the first child of the container', () => {
    const existing = document.createElement('p');
    container.appendChild(existing);
    renderTagFilter(container, { activeTag: 'first', onClear: () => {} });
    expect(container.firstElementChild.classList.contains('tag-filter-bar')).toBe(true);
  });

  it('clicking the clear button calls onClear once', () => {
    const onClear = vi.fn();
    renderTagFilter(container, { activeTag: 'remove-me', onClear });
    container.querySelector('.tag-filter-bar__clear').click();
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('replaces an existing filter bar when called again with a new tag', () => {
    renderTagFilter(container, { activeTag: 'first', onClear: () => {} });
    renderTagFilter(container, { activeTag: 'second', onClear: () => {} });
    expect(container.querySelectorAll('.tag-filter-bar').length).toBe(1);
    expect(container.querySelector('.tag-filter-bar__tag').textContent).toBe('second');
  });

  it('removes an existing filter bar when activeTag becomes null', () => {
    renderTagFilter(container, { activeTag: 'visible', onClear: () => {} });
    renderTagFilter(container, { activeTag: null, onClear: () => {} });
    expect(container.querySelector('.tag-filter-bar')).toBeNull();
  });

  it('does not throw when onClear is not provided', () => {
    renderTagFilter(container, { activeTag: 'safe', onClear: undefined });
    expect(() => container.querySelector('.tag-filter-bar__clear').click()).not.toThrow();
  });
});

// ─── renderTagSidebar ─────────────────────────────────────────────────────────

describe('renderTagSidebar', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders the "Tags" header text', () => {
    renderTagSidebar(container, { tags: [], activeTag: null, onSelect: () => {} });
    expect(container.querySelector('.tag-sidebar__header').textContent).toContain('Tags');
  });

  it('always renders the "All Notes" item', () => {
    renderTagSidebar(container, { tags: [], activeTag: null, onSelect: () => {} });
    const allNotes = [...container.querySelectorAll('.tag-sidebar__item')]
      .find(el => el.textContent.includes('All Notes'));
    expect(allNotes).toBeDefined();
  });

  it('shows "No tags yet" placeholder when the tags array is empty', () => {
    renderTagSidebar(container, { tags: [], activeTag: null, onSelect: () => {} });
    expect(container.textContent).toContain('No tags yet');
  });

  it('does not show "No tags yet" when there are tags', () => {
    renderTagSidebar(container, {
      tags: [{ name: 'work', noteCount: 1 }],
      activeTag: null,
      onSelect: () => {},
    });
    expect(container.textContent).not.toContain('No tags yet');
  });

  it('renders each tag name and its noteCount', () => {
    const tags = [
      { name: 'work', noteCount: 3 },
      { name: 'idea', noteCount: 1 },
    ];
    renderTagSidebar(container, { tags, activeTag: null, onSelect: () => {} });
    expect(container.textContent).toContain('work');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('idea');
    expect(container.textContent).toContain('1');
  });

  it('applies the active class to the matching tag item', () => {
    const tags = [{ name: 'active-tag', noteCount: 2 }];
    renderTagSidebar(container, { tags, activeTag: 'active-tag', onSelect: () => {} });
    const item = container.querySelector('[data-tag="active-tag"]');
    expect(item.classList.contains('tag-sidebar__item--active')).toBe(true);
  });

  it('"All Notes" item is active when activeTag is null', () => {
    renderTagSidebar(container, {
      tags: [{ name: 'work', noteCount: 1 }],
      activeTag: null,
      onSelect: () => {},
    });
    const allNotesItem = container.querySelector('[data-tag=""]');
    expect(allNotesItem.classList.contains('tag-sidebar__item--active')).toBe(true);
  });

  it('"All Notes" item is not active when a tag is selected', () => {
    renderTagSidebar(container, {
      tags: [{ name: 'work', noteCount: 1 }],
      activeTag: 'work',
      onSelect: () => {},
    });
    const allNotesItem = container.querySelector('[data-tag=""]');
    expect(allNotesItem.classList.contains('tag-sidebar__item--active')).toBe(false);
  });

  it('clicking an inactive tag calls onSelect with the tag name', () => {
    const onSelect = vi.fn();
    renderTagSidebar(container, {
      tags: [{ name: 'click-me', noteCount: 1 }],
      activeTag: null,
      onSelect,
    });
    container.querySelector('[data-tag="click-me"]').click();
    expect(onSelect).toHaveBeenCalledWith('click-me');
  });

  it('clicking the currently active tag calls onSelect(null) to clear the filter', () => {
    const onSelect = vi.fn();
    renderTagSidebar(container, {
      tags: [{ name: 'active', noteCount: 1 }],
      activeTag: 'active',
      onSelect,
    });
    container.querySelector('[data-tag="active"]').click();
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('clicking "All Notes" always calls onSelect(null)', () => {
    const onSelect = vi.fn();
    renderTagSidebar(container, {
      tags: [{ name: 'work', noteCount: 1 }],
      activeTag: 'work',
      onSelect,
    });
    container.querySelector('[data-tag=""]').click();
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('toggle button collapses the sidebar', () => {
    renderTagSidebar(container, { tags: [], activeTag: null, onSelect: () => {} });
    const sidebar = container.querySelector('.tag-sidebar');
    const toggle = container.querySelector('.tag-sidebar__toggle');
    expect(sidebar.classList.contains('tag-sidebar--collapsed')).toBe(false);
    toggle.click();
    expect(sidebar.classList.contains('tag-sidebar--collapsed')).toBe(true);
  });

  it('toggle button expands a collapsed sidebar', () => {
    renderTagSidebar(container, { tags: [], activeTag: null, onSelect: () => {} });
    const toggle = container.querySelector('.tag-sidebar__toggle');
    toggle.click(); // collapse
    toggle.click(); // expand
    expect(container.querySelector('.tag-sidebar').classList.contains('tag-sidebar--collapsed')).toBe(false);
  });

  it('preserves collapsed state across re-renders', () => {
    renderTagSidebar(container, { tags: [], activeTag: null, onSelect: () => {} });
    container.querySelector('.tag-sidebar__toggle').click(); // collapse
    // Re-render with different props
    renderTagSidebar(container, {
      tags: [{ name: 'new', noteCount: 5 }],
      activeTag: null,
      onSelect: () => {},
    });
    expect(container.querySelector('.tag-sidebar--collapsed')).not.toBeNull();
  });
});

// ─── renderNoteList ───────────────────────────────────────────────────────────

describe('renderNoteList', () => {
  let container;
  const sampleNotes = [
    {
      id: 'n_aaa111',
      content: 'First note',
      tags: ['work'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'n_bbb222',
      content: 'Second note',
      tags: ['personal'],
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'n_ccc333',
      content: 'Third note — no tags',
      tags: [],
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('shows the empty state element when notes array is empty', () => {
    renderNoteList(container, { notes: [], filterTag: null, onSelect: () => {}, onDelete: () => {} });
    expect(container.querySelector('.empty-state')).not.toBeNull();
  });

  it('empty state shows "No notes yet" when there is no filter', () => {
    renderNoteList(container, { notes: [], filterTag: null, onSelect: () => {}, onDelete: () => {} });
    expect(container.textContent).toContain('No notes yet');
  });

  it('empty state shows a tag-specific message when filterTag is set', () => {
    renderNoteList(container, {
      notes: sampleNotes,
      filterTag: 'nonexistent',
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.textContent).toContain('No notes tagged "nonexistent"');
  });

  it('renders a .note-card for each visible note', () => {
    renderNoteList(container, {
      notes: sampleNotes,
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.querySelectorAll('.note-card').length).toBe(3);
  });

  it('each note card has data-id set to the note id', () => {
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.querySelector('.note-card').dataset.id).toBe('n_aaa111');
  });

  it('note card displays the content text', () => {
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.querySelector('.note-card__content').textContent).toBe('First note');
  });

  it('renders tag badges for a note that has tags', () => {
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    const badges = container.querySelectorAll('.tag-badge');
    expect(badges.length).toBe(1);
    expect(badges[0].dataset.tag).toBe('work');
  });

  it('does not render a tags row when a note has no tags', () => {
    renderNoteList(container, {
      notes: [sampleNotes[2]],
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.querySelector('.note-card__tags')).toBeNull();
  });

  it('note card footer contains a delete button', () => {
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.querySelector('.note-card__delete')).not.toBeNull();
  });

  it('delete button click calls onDelete with the note id', () => {
    const onDelete = vi.fn();
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect: () => {},
      onDelete,
    });
    container.querySelector('.note-card__delete').click();
    expect(onDelete).toHaveBeenCalledWith('n_aaa111');
  });

  it('delete button click does not trigger the card onSelect handler', () => {
    const onSelect = vi.fn();
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect,
      onDelete: () => {},
    });
    container.querySelector('.note-card__delete').click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clicking the card body calls onSelect with the full note object', () => {
    const onSelect = vi.fn();
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect,
      onDelete: () => {},
    });
    container.querySelector('.note-card').click();
    expect(onSelect).toHaveBeenCalledWith(sampleNotes[0]);
  });

  it('filters notes client-side by filterTag', () => {
    renderNoteList(container, {
      notes: sampleNotes,
      filterTag: 'work',
      onSelect: () => {},
      onDelete: () => {},
    });
    const cards = container.querySelectorAll('.note-card');
    expect(cards.length).toBe(1);
    expect(cards[0].dataset.id).toBe('n_aaa111');
  });

  it('shows empty state when filterTag matches no notes', () => {
    renderNoteList(container, {
      notes: sampleNotes,
      filterTag: 'absent-tag',
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.querySelectorAll('.note-card').length).toBe(0);
  });

  it('note card footer contains a date element', () => {
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.querySelector('.note-card__date')).not.toBeNull();
    // Should have some formatted date text
    expect(container.querySelector('.note-card__date').textContent.trim()).not.toBe('');
  });

  it('clears and re-renders when called again', () => {
    renderNoteList(container, {
      notes: sampleNotes,
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    renderNoteList(container, {
      notes: [sampleNotes[0]],
      filterTag: null,
      onSelect: () => {},
      onDelete: () => {},
    });
    expect(container.querySelectorAll('.note-card').length).toBe(1);
  });
});

// ─── createTagInput ───────────────────────────────────────────────────────────

describe('createTagInput', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders existing tags as chip elements', () => {
    createTagInput(container, { existingTags: ['work', 'todo'] });
    expect(container.querySelectorAll('.tag').length).toBe(2);
  });

  it('renders an input field when below max tags', () => {
    createTagInput(container, { existingTags: ['a'], maxTags: 5 });
    expect(container.querySelector('.tag-new-input')).not.toBeNull();
  });

  it('shows "Max N tags" message instead of input when at the limit', () => {
    createTagInput(container, { existingTags: ['a', 'b', 'c'], maxTags: 3 });
    expect(container.querySelector('.tag-new-input')).toBeNull();
    expect(container.textContent).toContain('Max 3 tags');
  });

  it('clicking × on a chip removes the tag and calls onRemove', () => {
    const onRemove = vi.fn();
    createTagInput(container, { existingTags: ['remove-me'], onRemove });
    container.querySelector('.tag-remove').click();
    expect(onRemove).toHaveBeenCalledWith('remove-me');
    expect(container.querySelectorAll('.tag').length).toBe(0);
  });

  it('clicking × on one chip does not affect other chips', () => {
    createTagInput(container, { existingTags: ['keep', 'remove'], onRemove: () => {} });
    const removes = container.querySelectorAll('.tag-remove');
    // Click × on the second tag ('remove')
    removes[1].click();
    expect(container.querySelectorAll('.tag').length).toBe(1);
    expect(container.querySelector('.tag').dataset.tag).toBe('keep');
  });

  it('adds a tag via Enter key and calls onAdd', () => {
    const onAdd = vi.fn();
    createTagInput(container, { existingTags: [], onAdd });
    const input = container.querySelector('.tag-new-input');
    input.value = 'newtag';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onAdd).toHaveBeenCalledWith('newtag');
  });

  it('normalizes added tags to lowercase', () => {
    const onAdd = vi.fn();
    createTagInput(container, { existingTags: [], onAdd });
    const input = container.querySelector('.tag-new-input');
    input.value = 'UPPERCASE';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onAdd).toHaveBeenCalledWith('uppercase');
  });

  it('does not add a duplicate tag', () => {
    const onAdd = vi.fn();
    createTagInput(container, { existingTags: ['existing'], onAdd });
    const input = container.querySelector('.tag-new-input');
    input.value = 'existing';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('does not add a tag that exceeds maxLength', () => {
    const onAdd = vi.fn();
    createTagInput(container, { existingTags: [], maxLength: 5, onAdd });
    const input = container.querySelector('.tag-new-input');
    input.value = 'toolong'; // 7 chars > 5
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('Backspace on empty input removes the last tag and calls onRemove', () => {
    const onRemove = vi.fn();
    createTagInput(container, { existingTags: ['last'], onRemove });
    const input = container.querySelector('.tag-new-input');
    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(onRemove).toHaveBeenCalledWith('last');
    expect(container.querySelectorAll('.tag').length).toBe(0);
  });

  it('Backspace on non-empty input does NOT remove the last tag', () => {
    const onRemove = vi.fn();
    createTagInput(container, { existingTags: ['keep'], onRemove });
    const input = container.querySelector('.tag-new-input');
    input.value = 'typing';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('shows suggestions from allTags that match the input value', () => {
    createTagInput(container, {
      existingTags: [],
      allTags: ['suggestion-one', 'suggestion-two', 'other'],
    });
    const input = container.querySelector('.tag-new-input');
    input.value = 'sug';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const suggestionsEl = container.querySelector('.tag-suggestions');
    expect(suggestionsEl.classList.contains('hidden')).toBe(false);
    expect(suggestionsEl.textContent).toContain('suggestion-one');
    expect(suggestionsEl.textContent).toContain('suggestion-two');
    expect(suggestionsEl.textContent).not.toContain('other');
  });

  it('hides suggestions when input is cleared', () => {
    createTagInput(container, { existingTags: [], allTags: ['abc'] });
    const input = container.querySelector('.tag-new-input');
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const suggestionsEl = container.querySelector('.tag-suggestions');
    expect(suggestionsEl.classList.contains('hidden')).toBe(true);
  });

  it('Escape key hides the suggestions dropdown', () => {
    createTagInput(container, { existingTags: [], allTags: ['one', 'two'] });
    const input = container.querySelector('.tag-new-input');
    input.value = 'one';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const suggestionsEl = container.querySelector('.tag-suggestions');
    expect(suggestionsEl.classList.contains('hidden')).toBe(false);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(suggestionsEl.classList.contains('hidden')).toBe(true);
  });

  it('setTags replaces the full tag list and re-renders the chips', () => {
    const { setTags } = createTagInput(container, { existingTags: ['old'] });
    setTags(['new1', 'new2']);
    const chips = container.querySelectorAll('.tag');
    expect(chips.length).toBe(2);
    expect([...chips].map(c => c.dataset.tag)).toEqual(['new1', 'new2']);
  });

  it('setAllTags updates the autocomplete source used for suggestions', () => {
    const { setAllTags } = createTagInput(container, {
      existingTags: [],
      allTags: ['old-suggestion'],
    });
    setAllTags(['new-suggestion']);
    const input = container.querySelector('.tag-new-input');
    input.value = 'new';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const suggestionsEl = container.querySelector('.tag-suggestions');
    expect(suggestionsEl.textContent).toContain('new-suggestion');
    expect(suggestionsEl.textContent).not.toContain('old-suggestion');
  });

  it('suggestions exclude tags already added', () => {
    createTagInput(container, {
      existingTags: ['work'],
      allTags: ['work', 'personal'],
    });
    const input = container.querySelector('.tag-new-input');
    input.value = 'w';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const suggestionsEl = container.querySelector('.tag-suggestions');
    expect(suggestionsEl.textContent).not.toContain('work');
  });
});
