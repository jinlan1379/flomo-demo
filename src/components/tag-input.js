/**
 * Generic chip-style tag input component.
 *
 * Usage:
 *   createTagInput(containerEl, {
 *     existingTags: ['work', 'todo'],
 *     allTags: ['work', 'todo', 'idea'],   // autocomplete source
 *     maxTags: 10,
 *     maxLength: 32,
 *     onAdd: (tag) => { ... },
 *     onRemove: (tag) => { ... },
 *   });
 */
export function createTagInput(container, {
  existingTags = [],
  allTags = [],
  maxTags = 10,
  maxLength = 32,
  onAdd,
  onRemove,
} = {}) {
  let tags = [...existingTags];
  let suggestions = [];
  let selectedSuggestion = -1;

  function render() {
    const atMax = tags.length >= maxTags;

    container.innerHTML = `
      <div class="tag-input-container" style="position: relative;">
        ${tags.map(t => `
          <span class="tag" data-tag="${t}">
            ${t}
            <span class="tag-remove" data-tag="${t}" aria-label="Remove ${t}">&times;</span>
          </span>
        `).join('')}
        ${atMax
          ? `<span class="text-sm text-muted" style="align-self:center;">Max ${maxTags} tags</span>`
          : `<input type="text" class="tag-new-input" placeholder="${tags.length ? '' : 'Add tag...'}"
               maxlength="${maxLength}" style="border:none;background:transparent;padding:0;flex:1;min-width:60px;">`
        }
        <div class="tag-suggestions hidden"></div>
      </div>
    `;

    // Remove tag on chip × click
    container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagName = btn.dataset.tag;
        tags = tags.filter(t => t !== tagName);
        onRemove?.(tagName);
        render();
      });
    });

    if (atMax) return;

    const input = container.querySelector('.tag-new-input');
    const suggestionsEl = container.querySelector('.tag-suggestions');

    input.addEventListener('input', () => {
      const value = input.value.trim();
      if (!value) {
        suggestionsEl.classList.add('hidden');
        selectedSuggestion = -1;
        return;
      }

      suggestions = allTags
        .filter(n => n.toLowerCase().includes(value.toLowerCase()) && !tags.includes(n));

      if (suggestions.length > 0) {
        suggestionsEl.innerHTML = suggestions.map((s, i) =>
          `<div class="tag-suggestion${i === selectedSuggestion ? ' active' : ''}" data-name="${s}">${s}</div>`
        ).join('');
        suggestionsEl.classList.remove('hidden');
      } else {
        suggestionsEl.classList.add('hidden');
        selectedSuggestion = -1;
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = selectedSuggestion >= 0 ? suggestions[selectedSuggestion] : input.value.trim();
        if (value) addTag(value);
      } else if (e.key === 'Backspace' && !input.value && tags.length) {
        const lastTag = tags[tags.length - 1];
        tags.pop();
        onRemove?.(lastTag);
        render();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSuggestion = Math.min(selectedSuggestion + 1, suggestions.length - 1);
        updateSuggestionHighlight(suggestionsEl);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSuggestion = Math.max(selectedSuggestion - 1, -1);
        updateSuggestionHighlight(suggestionsEl);
      } else if (e.key === 'Escape') {
        suggestionsEl.classList.add('hidden');
        selectedSuggestion = -1;
      }
    });

    suggestionsEl.addEventListener('click', (e) => {
      const item = e.target.closest('.tag-suggestion');
      if (item) addTag(item.dataset.name);
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        suggestionsEl.classList.add('hidden');
        selectedSuggestion = -1;
      }
    }, { once: true });
  }

  function addTag(name) {
    const normalized = name.trim().toLowerCase();
    if (!normalized || normalized.length > maxLength) return;
    if (tags.includes(normalized)) return;
    if (tags.length >= maxTags) return;

    tags.push(normalized);
    selectedSuggestion = -1;
    onAdd?.(normalized);
    render();
  }

  function updateSuggestionHighlight(suggestionsEl) {
    suggestionsEl.querySelectorAll('.tag-suggestion').forEach((el, i) => {
      el.classList.toggle('active', i === selectedSuggestion);
    });
  }

  /** Update the allTags autocomplete source without re-rendering chips. */
  function setAllTags(newAllTags) {
    allTags = newAllTags;
  }

  /** Replace the current tag list (e.g. after a save). */
  function setTags(newTags) {
    tags = [...newTags];
    render();
  }

  render();

  return { setAllTags, setTags };
}
