import { api } from '../services/api.js';

export function createTagInput(container, photoId, currentTags, onUpdate) {
  let tags = [...currentTags];
  let suggestions = [];
  let selectedSuggestion = -1;

  function render() {
    container.innerHTML = `
      <div class="tag-input-container" style="position: relative;">
        ${tags.map(t => `
          <span class="tag">
            ${t}
            <span class="tag-remove" data-tag="${t}">&times;</span>
          </span>
        `).join('')}
        <input type="text" id="tag-new-input" placeholder="${tags.length ? '' : 'Add tag...'}" style="border: none; background: transparent; padding: 0; flex: 1; min-width: 60px;">
        <div class="tag-suggestions hidden" id="tag-suggestions"></div>
      </div>
    `;

    // Remove tag
    container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tagName = btn.dataset.tag;
        try {
          await api.removeTag(photoId, tagName);
          tags = tags.filter(t => t !== tagName);
          render();
          onUpdate?.(tags);
        } catch (err) {
          console.error('Failed to remove tag:', err);
        }
      });
    });

    const input = container.querySelector('#tag-new-input');
    const suggestionsEl = container.querySelector('#tag-suggestions');

    input.addEventListener('input', async () => {
      const value = input.value.trim();
      if (!value) {
        suggestionsEl.classList.add('hidden');
        return;
      }
      try {
        const data = await api.getTags();
        suggestions = data.tags
          .map(t => t.name)
          .filter(n => n.toLowerCase().includes(value.toLowerCase()) && !tags.includes(n));
        if (suggestions.length > 0) {
          suggestionsEl.innerHTML = suggestions.map((s, i) =>
            `<div class="tag-suggestion${i === selectedSuggestion ? ' active' : ''}" data-name="${s}">${s}</div>`
          ).join('');
          suggestionsEl.classList.remove('hidden');
        } else {
          suggestionsEl.classList.add('hidden');
        }
      } catch (err) {
        suggestionsEl.classList.add('hidden');
      }
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = selectedSuggestion >= 0 ? suggestions[selectedSuggestion] : input.value.trim();
        if (value) await addTag(value);
      } else if (e.key === 'Backspace' && !input.value && tags.length) {
        const lastTag = tags[tags.length - 1];
        try {
          await api.removeTag(photoId, lastTag);
          tags.pop();
          render();
          onUpdate?.(tags);
        } catch (err) {
          console.error('Failed to remove tag:', err);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSuggestion = Math.min(selectedSuggestion + 1, suggestions.length - 1);
        updateSuggestionHighlight(suggestionsEl);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSuggestion = Math.max(selectedSuggestion - 1, -1);
        updateSuggestionHighlight(suggestionsEl);
      }
    });

    suggestionsEl.addEventListener('click', async (e) => {
      const item = e.target.closest('.tag-suggestion');
      if (item) await addTag(item.dataset.name);
    });

    async function addTag(name) {
      try {
        const updated = await api.addTags(photoId, [name]);
        tags = updated.tags;
        selectedSuggestion = -1;
        render();
        onUpdate?.(tags);
      } catch (err) {
        console.error('Failed to add tag:', err);
      }
    }
  }

  function updateSuggestionHighlight(suggestionsEl) {
    suggestionsEl.querySelectorAll('.tag-suggestion').forEach((el, i) => {
      el.classList.toggle('active', i === selectedSuggestion);
    });
  }

  render();
}
