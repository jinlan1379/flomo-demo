import { setSearch, toggleSelectMode, getState } from '../main.js';

let debounceTimer = null;

export function renderSearchBar() {
  const header = document.getElementById('header');
  if (!header) return;

  header.innerHTML = `
    <button class="btn btn-ghost btn-icon" id="toggle-sidebar" title="Toggle sidebar">☰</button>
    <div class="search-bar" id="search-bar">
      <span class="search-icon">🔍</span>
      <input type="search" id="search-input" placeholder="Search photos by name, tag, or description...">
      <button class="clear-btn" id="search-clear">&times;</button>
    </div>
    <button class="btn btn-secondary btn-sm" id="select-mode-btn">Select</button>
  `;

  const input = document.getElementById('search-input');
  const searchBar = document.getElementById('search-bar');
  const clearBtn = document.getElementById('search-clear');

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const value = input.value.trim();
    searchBar.classList.toggle('has-value', value.length > 0);

    debounceTimer = setTimeout(() => {
      setSearch(value, '');
    }, 300);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    searchBar.classList.remove('has-value');
    setSearch('', '');
  });

  // Toggle sidebar on mobile
  document.getElementById('toggle-sidebar').addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  // Select mode
  document.getElementById('select-mode-btn').addEventListener('click', () => {
    toggleSelectMode();
    const btn = document.getElementById('select-mode-btn');
    const s = getState();
    btn.textContent = s.selectMode ? 'Cancel' : 'Select';
    btn.className = s.selectMode ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  });
}
