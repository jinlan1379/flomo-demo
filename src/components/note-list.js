import { createTagBadge } from './tag-badge.js';

/**
 * Renders the list of notes into `container`.
 *
 * @param {HTMLElement} container
 * @param {object} props
 * @param {Array} props.notes - Full notes array from state.
 * @param {string|null} props.filterTag - Currently active tag filter.
 * @param {(note: object) => void} props.onSelect - Called when a note card is clicked.
 * @param {(noteId: string) => void} props.onDelete - Called when the delete button is clicked.
 */
export function renderNoteList(container, { notes = [], filterTag = null, onSelect, onDelete }) {
  const visible = filterTag
    ? notes.filter(n => n.tags.includes(filterTag))
    : notes;

  container.innerHTML = '';

  if (visible.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📝</div>
        <p>${filterTag ? `No notes tagged "${filterTag}"` : 'No notes yet'}</p>
        <p class="text-sm text-muted">Click "+ New Note" to create one.</p>
      </div>
    `;
    return;
  }

  for (const note of visible) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = note.id;

    const content = document.createElement('div');
    content.className = 'note-card__content';
    content.textContent = note.content;
    card.appendChild(content);

    if (note.tags.length > 0) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'note-card__tags';
      for (const tag of note.tags) {
        tagsRow.appendChild(createTagBadge(tag));
      }
      card.appendChild(tagsRow);
    }

    const footer = document.createElement('div');
    footer.className = 'note-card__footer';

    const date = document.createElement('span');
    date.className = 'note-card__date';
    date.textContent = formatDate(note.updatedAt || note.createdAt);
    footer.appendChild(date);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-card__delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.title = 'Delete note';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete?.(note.id);
    });
    footer.appendChild(deleteBtn);

    card.appendChild(footer);

    card.addEventListener('click', () => onSelect?.(note));

    container.appendChild(card);
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
