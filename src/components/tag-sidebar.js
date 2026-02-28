/**
 * Renders the tag sidebar into the given container.
 *
 * @param {HTMLElement} container
 * @param {object} props
 * @param {Array<{name: string, noteCount: number}>} props.tags
 * @param {string|null} props.activeTag - Currently selected filter tag, or null.
 * @param {(tag: string|null) => void} props.onSelect - Called with tag name or null (for "All Notes").
 */
export function renderTagSidebar(container, { tags = [], activeTag = null, onSelect }) {
  // Preserve collapse state across re-renders
  const wasCollapsed = container.querySelector('.tag-sidebar--collapsed') !== null;

  container.innerHTML = `
    <div class="tag-sidebar${wasCollapsed ? ' tag-sidebar--collapsed' : ''}">
      <div class="tag-sidebar__header">
        <span>Tags</span>
        <button class="tag-sidebar__toggle" title="Toggle tag list" aria-label="Toggle tag list">
          ${wasCollapsed ? '▶' : '▼'}
        </button>
      </div>
      <div class="tag-sidebar__list">
        <div class="tag-sidebar__item${!activeTag ? ' tag-sidebar__item--active' : ''}" data-tag="">
          <span>All Notes</span>
        </div>
        ${tags.map(t => `
          <div class="tag-sidebar__item${activeTag === t.name ? ' tag-sidebar__item--active' : ''}" data-tag="${t.name}">
            <span>${t.name}</span>
            <span class="tag-sidebar__count">${t.noteCount}</span>
          </div>
        `).join('')}
        ${tags.length === 0
          ? '<div class="tag-sidebar__item" style="color:var(--color-text-muted);font-size:var(--font-size-sm);cursor:default;">No tags yet</div>'
          : ''}
      </div>
    </div>
  `;

  const sidebar = container.querySelector('.tag-sidebar');

  // Collapse / expand toggle
  container.querySelector('.tag-sidebar__toggle').addEventListener('click', () => {
    sidebar.classList.toggle('tag-sidebar--collapsed');
    const btn = container.querySelector('.tag-sidebar__toggle');
    btn.textContent = sidebar.classList.contains('tag-sidebar--collapsed') ? '▶' : '▼';
  });

  // Tag filter clicks
  container.querySelectorAll('.tag-sidebar__item[data-tag]').forEach(item => {
    item.addEventListener('click', () => {
      const tag = item.dataset.tag || null;
      // Clicking the active tag clears the filter
      if (tag === activeTag) {
        onSelect?.(null);
      } else {
        onSelect?.(tag);
      }
    });
  });
}
