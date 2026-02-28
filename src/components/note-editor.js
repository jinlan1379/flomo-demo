import { api } from '../services/api.js';
import { createTagInput } from './tag-input.js';

/**
 * Opens the note editor as a modal.
 *
 * @param {object} props
 * @param {object|null} props.note - Existing note to edit, or null to create new.
 * @param {string[]} props.allTags - Autocomplete source.
 * @param {(saved: object) => void} props.onSave - Called with the saved note object.
 * @param {() => void} props.onCancel
 */
export function openNoteEditor({ note = null, allTags = [], onSave, onCancel }) {
  const isNew = !note;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal" style="min-width:480px;max-width:600px;width:90vw;">
      <h3>${isNew ? 'New Note' : 'Edit Note'}</h3>
      <div class="note-editor">
        <textarea class="note-editor__textarea" id="note-content" rows="6"
          placeholder="Write your note here...">${note ? note.content : ''}</textarea>
        <div>
          <div class="note-editor__tags-label">Tags</div>
          <div id="note-tag-input-container"></div>
        </div>
        <div class="note-editor__error" id="note-editor-error"></div>
        <div class="note-editor__actions">
          <button class="btn btn-ghost" id="note-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="note-save-btn">${isNew ? 'Create' : 'Save'}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const textarea = backdrop.querySelector('#note-content');
  const errorEl = backdrop.querySelector('#note-editor-error');
  const tagInputContainer = backdrop.querySelector('#note-tag-input-container');

  // Track pending tag changes independently of server (saved on submit)
  let pendingTags = note ? [...note.tags] : [];

  createTagInput(tagInputContainer, {
    existingTags: pendingTags,
    allTags,
    maxTags: 10,
    maxLength: 32,
    onAdd(tag) { pendingTags.push(tag); },
    onRemove(tag) { pendingTags = pendingTags.filter(t => t !== tag); },
  });

  textarea.focus();

  const close = () => {
    backdrop.remove();
    onCancel?.();
  };

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('#note-cancel-btn').addEventListener('click', close);

  backdrop.querySelector('#note-save-btn').addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) {
      errorEl.textContent = 'Note content cannot be empty.';
      textarea.focus();
      return;
    }
    errorEl.textContent = '';

    try {
      let saved;
      if (isNew) {
        saved = await api.createNote({ content, tags: pendingTags });
      } else {
        // Update content
        saved = await api.updateNote(note.id, { content });

        // Sync tags: add new ones, remove deleted ones
        const toAdd = pendingTags.filter(t => !note.tags.includes(t));
        const toRemove = note.tags.filter(t => !pendingTags.includes(t));

        if (toAdd.length > 0) {
          saved = await api.addNoteTags(note.id, toAdd);
        }
        for (const tag of toRemove) {
          saved = await api.removeNoteTag(note.id, tag);
        }
      }

      backdrop.remove();
      onSave?.(saved);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  // Submit on Ctrl+Enter / Cmd+Enter
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      backdrop.querySelector('#note-save-btn').click();
    }
  });
}
