/**
 * Creates a display-only tag pill element.
 *
 * @param {string} tag - The tag text to display.
 * @param {object} [options]
 * @param {boolean} [options.removable=false] - Whether to show a remove (×) button.
 * @param {(tag: string) => void} [options.onRemove] - Called when the remove button is clicked.
 * @returns {HTMLElement}
 */
export function createTagBadge(tag, { removable = false, onRemove } = {}) {
  const el = document.createElement('span');
  el.className = 'tag-badge';
  el.dataset.tag = tag;
  el.textContent = tag;

  if (removable) {
    const btn = document.createElement('span');
    btn.className = 'tag-badge-remove';
    btn.innerHTML = '&times;';
    btn.title = `Remove "${tag}"`;
    btn.setAttribute('aria-label', `Remove tag ${tag}`);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove?.(tag);
    });
    el.appendChild(btn);
  }

  return el;
}
