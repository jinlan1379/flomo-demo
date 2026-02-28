/**
 * Renders (or removes) the active-filter banner into the given container.
 *
 * When activeTag is null the banner is removed from the DOM entirely.
 *
 * @param {HTMLElement} container
 * @param {object} props
 * @param {string|null} props.activeTag
 * @param {() => void} props.onClear
 */
export function renderTagFilter(container, { activeTag, onClear }) {
  // Remove any existing banner
  const existing = container.querySelector('.tag-filter-bar');
  if (existing) existing.remove();

  if (!activeTag) return;

  const bar = document.createElement('div');
  bar.className = 'tag-filter-bar';
  bar.innerHTML = `
    <span class="tag-filter-bar__label">Filtered by:</span>
    <span class="tag-filter-bar__tag">${activeTag}</span>
    <button class="tag-filter-bar__clear" title="Clear filter" aria-label="Clear tag filter">&times;</button>
  `;

  bar.querySelector('.tag-filter-bar__clear').addEventListener('click', () => {
    onClear?.();
  });

  // Insert at the start of the container
  container.insertBefore(bar, container.firstChild);
}
