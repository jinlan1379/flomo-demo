import { api } from '../services/api.js';
import { loadPhotos, loadTags, getState, openPhoto } from '../main.js';

let lightboxEl = null;
let currentPhoto = null;
let currentState = null;

export function renderLightbox(photo, state) {
  currentPhoto = photo;
  currentState = state;
  closeLightbox();

  lightboxEl = document.createElement('div');
  lightboxEl.className = 'lightbox';
  lightboxEl.id = 'lightbox';

  lightboxEl.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-close" id="lightbox-close">&times;</button>
      <img class="lightbox-image" src="${photo.url}" alt="${photo.title || photo.file_name}">
      <div class="lightbox-info">
        <h3 id="lb-title">${photo.title || photo.file_name}</h3>
        <div class="text-sm text-muted mb-md">${photo.file_name}</div>

        <div class="mb-md">
          <div class="star-rating" id="lb-rating">
            ${renderStars(photo.rating)}
          </div>
        </div>

        <div class="mb-md" id="lb-tags-section">
          <div class="text-sm text-muted mb-md">Tags</div>
          <div id="lb-tags" class="flex gap-sm" style="flex-wrap: wrap;">
            ${renderTagBadges(photo.tags || [])}
          </div>
          <div class="tag-input-container mt-md" style="position: relative;">
            <input type="text" id="lb-tag-input" placeholder="Add tag..." style="border: none; background: transparent; padding: 0; flex: 1; min-width: 60px;">
          </div>
        </div>

        <div class="mb-md" id="lb-metadata">
          ${renderMetadata(photo)}
        </div>

        <button class="btn btn-secondary btn-sm" id="lb-edit-btn">Edit Info</button>
        <div id="lb-edit-form" class="hidden mt-md">
          ${renderEditForm(photo)}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(lightboxEl);

  // Event listeners
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  lightboxEl.addEventListener('click', (e) => {
    if (e.target === lightboxEl) closeLightbox();
  });

  // Escape key
  document.addEventListener('keydown', handleKeydown);

  // Star rating clicks
  setupStarRating();

  // Tag input
  setupTagInput(photo);

  // Edit form
  setupEditForm(photo);
}

function handleKeydown(e) {
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const state = currentState || getState();
    const idx = state.photos.findIndex(p => p.id === currentPhoto.id);
    if (idx === -1) return;
    const nextIdx = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
    if (nextIdx >= 0 && nextIdx < state.photos.length) {
      openPhoto(state.photos[nextIdx]);
    }
  }
}

export function closeLightbox() {
  if (lightboxEl) {
    lightboxEl.remove();
    lightboxEl = null;
    document.removeEventListener('keydown', handleKeydown);
  }
}

function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star${i <= (rating || 0) ? ' filled' : ''}" data-value="${i}">★</span>`;
  }
  return html;
}

function renderTagBadges(tags) {
  if (!tags.length) return '<span class="text-sm text-muted">No tags</span>';
  return tags.map(t => `
    <span class="tag">
      ${t}
      <span class="tag-remove" data-tag="${t}">&times;</span>
    </span>
  `).join('');
}

function renderMetadata(photo) {
  const items = [];
  if (photo.date_taken) items.push(`<div><span class="text-muted">Date:</span> ${photo.date_taken}</div>`);
  if (photo.width && photo.height) items.push(`<div><span class="text-muted">Size:</span> ${photo.width} × ${photo.height}</div>`);
  if (photo.file_size) items.push(`<div><span class="text-muted">File:</span> ${formatSize(photo.file_size)}</div>`);
  if (photo.mime_type) items.push(`<div><span class="text-muted">Type:</span> ${photo.mime_type}</div>`);
  if (photo.description) items.push(`<div class="mt-md"><span class="text-muted">Description:</span><br>${photo.description}</div>`);
  return items.join('') || '<span class="text-sm text-muted">No metadata</span>';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function renderEditForm(photo) {
  return `
    <div class="flex-col gap-sm">
      <label class="text-sm">Title</label>
      <input type="text" id="edit-title" value="${photo.title || ''}">
      <label class="text-sm">Description</label>
      <textarea id="edit-description" rows="3">${photo.description || ''}</textarea>
      <label class="text-sm">Date Taken</label>
      <input type="date" id="edit-date" value="${photo.date_taken ? photo.date_taken.split('T')[0] : ''}">
      <div class="flex gap-sm mt-md">
        <button class="btn btn-primary btn-sm" id="edit-save">Save</button>
        <button class="btn btn-ghost btn-sm" id="edit-cancel">Cancel</button>
      </div>
    </div>
  `;
}

function setupStarRating() {
  const ratingEl = document.getElementById('lb-rating');
  if (!ratingEl) return;

  ratingEl.addEventListener('click', async (e) => {
    const star = e.target.closest('.star');
    if (!star) return;
    const value = parseInt(star.dataset.value);
    try {
      const updated = await api.updatePhoto(currentPhoto.id, { rating: value });
      currentPhoto.rating = updated.rating;
      ratingEl.innerHTML = renderStars(updated.rating);
      setupStarRating();
      loadPhotos();
    } catch (err) {
      console.error('Failed to update rating:', err);
    }
  });

  ratingEl.addEventListener('mouseover', (e) => {
    const star = e.target.closest('.star');
    if (!star) return;
    const value = parseInt(star.dataset.value);
    ratingEl.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('hover', parseInt(s.dataset.value) <= value);
    });
  });

  ratingEl.addEventListener('mouseout', () => {
    ratingEl.querySelectorAll('.star').forEach(s => s.classList.remove('hover'));
  });
}

function setupTagInput(photo) {
  const input = document.getElementById('lb-tag-input');
  const tagsContainer = document.getElementById('lb-tags');
  if (!input || !tagsContainer) return;

  // Add tag on Enter
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      const tagName = input.value.trim();
      try {
        const updated = await api.addTags(photo.id, [tagName]);
        currentPhoto.tags = updated.tags;
        tagsContainer.innerHTML = renderTagBadges(updated.tags);
        setupTagRemoval(photo);
        input.value = '';
        loadTags();
      } catch (err) {
        console.error('Failed to add tag:', err);
      }
    }
  });

  setupTagRemoval(photo);
}

function setupTagRemoval(photo) {
  const tagsContainer = document.getElementById('lb-tags');
  if (!tagsContainer) return;

  tagsContainer.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tagName = btn.dataset.tag;
      try {
        await api.removeTag(photo.id, tagName);
        currentPhoto.tags = (currentPhoto.tags || []).filter(t => t !== tagName);
        tagsContainer.innerHTML = renderTagBadges(currentPhoto.tags);
        setupTagRemoval(photo);
        loadTags();
      } catch (err) {
        console.error('Failed to remove tag:', err);
      }
    });
  });
}

function setupEditForm(photo) {
  const editBtn = document.getElementById('lb-edit-btn');
  const editForm = document.getElementById('lb-edit-form');
  if (!editBtn || !editForm) return;

  editBtn.addEventListener('click', () => {
    editForm.classList.toggle('hidden');
    editBtn.textContent = editForm.classList.contains('hidden') ? 'Edit Info' : 'Cancel Edit';
  });

  editForm.querySelector('#edit-save')?.addEventListener('click', async () => {
    const title = document.getElementById('edit-title').value;
    const description = document.getElementById('edit-description').value;
    const date_taken = document.getElementById('edit-date').value || null;

    try {
      const updated = await api.updatePhoto(photo.id, { title, description, date_taken });
      Object.assign(currentPhoto, updated);
      document.getElementById('lb-title').textContent = updated.title || updated.file_name;
      document.getElementById('lb-metadata').innerHTML = renderMetadata(updated);
      editForm.classList.add('hidden');
      editBtn.textContent = 'Edit Info';
      loadPhotos();
    } catch (err) {
      console.error('Failed to update photo:', err);
    }
  });

  editForm.querySelector('#edit-cancel')?.addEventListener('click', () => {
    editForm.classList.add('hidden');
    editBtn.textContent = 'Edit Info';
  });
}
