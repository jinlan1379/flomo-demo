import { openPhoto, togglePhotoSelection, getState, setSort, setPage } from '../main.js';

let galleryEl = null;

export function renderGallery(state) {
  const container = document.getElementById('gallery-container');
  if (!container) return;

  container.innerHTML = '';

  // Action bar for select mode
  const actionBar = document.createElement('div');
  actionBar.id = 'action-bar';
  actionBar.className = 'action-bar hidden';
  container.appendChild(actionBar);

  // Sort controls
  const sortBar = document.createElement('div');
  sortBar.className = 'sort-controls mb-md';
  sortBar.innerHTML = `
    <label class="text-sm text-muted">Sort:</label>
    <select id="sort-select">
      <option value="date" ${state.sort === 'date' ? 'selected' : ''}>Date</option>
      <option value="name" ${state.sort === 'name' ? 'selected' : ''}>Name</option>
      <option value="rating" ${state.sort === 'rating' ? 'selected' : ''}>Rating</option>
    </select>
    <select id="order-select">
      <option value="desc" ${state.order === 'desc' ? 'selected' : ''}>Newest first</option>
      <option value="asc" ${state.order === 'asc' ? 'selected' : ''}>Oldest first</option>
    </select>
  `;
  container.appendChild(sortBar);

  // Gallery grid
  galleryEl = document.createElement('div');
  galleryEl.className = `gallery${state.selectMode ? ' select-mode' : ''}`;
  galleryEl.id = 'gallery';
  container.appendChild(galleryEl);

  if (state.photos.length === 0) {
    galleryEl.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="icon">📷</div>
        <p>No photos found</p>
        <p class="text-sm text-muted">Add photos to your configured directory and refresh.</p>
      </div>
    `;
    return;
  }

  renderPhotoCards(state);
  renderPagination(container, state);

  // Sort event listeners
  sortBar.querySelector('#sort-select').addEventListener('change', (e) => {
    setSort(e.target.value);
  });
  sortBar.querySelector('#order-select').addEventListener('change', (e) => {
    const s = getState();
    setSort(s.sort, e.target.value);
  });
}

function renderPagination(container, state) {
  const totalPages = Math.ceil(state.total / state.limit);
  if (totalPages <= 1) return;

  const pag = document.createElement('div');
  pag.className = 'pagination';
  pag.innerHTML = `
    <button class="btn btn-sm btn-secondary" id="page-prev" ${state.page <= 1 ? 'disabled' : ''}>Prev</button>
    <span class="page-info">Page ${state.page} of ${totalPages} (${state.total} photos)</span>
    <button class="btn btn-sm btn-secondary" id="page-next" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
  `;
  container.appendChild(pag);

  pag.querySelector('#page-prev').addEventListener('click', () => {
    if (state.page > 1) setPage(state.page - 1);
  });
  pag.querySelector('#page-next').addEventListener('click', () => {
    if (state.page < totalPages) setPage(state.page + 1);
  });
}

function renderPhotoCards(state) {
  if (!galleryEl) return;
  galleryEl.innerHTML = '';

  for (const photo of state.photos) {
    const card = document.createElement('div');
    card.className = `photo-card${state.selectedPhotos.has(photo.id) ? ' selected' : ''}`;
    card.dataset.id = photo.id;

    const checkbox = document.createElement('div');
    checkbox.className = 'select-checkbox';
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePhotoSelection(photo.id);
    });
    card.appendChild(checkbox);

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.title || photo.file_name;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      card.classList.add('broken');
    });
    card.appendChild(img);

    const overlay = document.createElement('div');
    overlay.className = 'photo-overlay';
    overlay.textContent = photo.title || photo.file_name;
    card.appendChild(overlay);

    card.addEventListener('click', () => {
      if (state.selectMode) {
        togglePhotoSelection(photo.id);
      } else {
        openPhoto(photo);
      }
    });

    galleryEl.appendChild(card);
  }
}

export function updateGallery(state) {
  if (!galleryEl) return renderGallery(state);

  galleryEl.className = `gallery${state.selectMode ? ' select-mode' : ''}`;
  renderPhotoCards(state);

  // Update action bar visibility
  const actionBar = document.getElementById('action-bar');
  if (actionBar) {
    if (state.selectMode && state.selectedPhotos.size > 0) {
      actionBar.classList.remove('hidden');
      actionBar.innerHTML = `
        <span class="text-sm">${state.selectedPhotos.size} selected</span>
        <button class="btn btn-sm btn-primary" id="add-to-album-btn">Add to Album</button>
        <button class="btn btn-sm btn-ghost" id="cancel-select-btn">Cancel</button>
      `;
    } else {
      actionBar.classList.add('hidden');
    }
  }
}
