import { api } from '../services/api.js';
import { setAlbumFilter, loadAlbums, getState } from '../main.js';

export function renderSidebar(state) {
  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) return;

  sidebarEl.innerHTML = `
    <div class="sidebar-header">Albums</div>
    <div class="sidebar-section">
      <div class="sidebar-item${!state.currentAlbum ? ' active' : ''}" data-album-id="">
        <span>All Photos</span>
        <span class="count">${state.total || 0}</span>
      </div>
      ${state.albums.map(a => `
        <div class="sidebar-item${state.currentAlbum === a.id ? ' active' : ''}" data-album-id="${a.id}">
          <span>${a.name}</span>
          <div class="flex items-center gap-sm">
            <span class="count">${a.photo_count}</span>
            <button class="btn btn-ghost btn-icon btn-sm album-rename" data-id="${a.id}" title="Rename">✏️</button>
            <button class="btn btn-ghost btn-icon btn-sm album-delete" data-id="${a.id}" title="Delete">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="padding: var(--spacing-md);">
      <button class="btn btn-primary" id="create-album-btn" style="width: 100%;">+ Create Album</button>
    </div>
  `;

  // Album filter clicks
  sidebarEl.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.album-rename') || e.target.closest('.album-delete')) return;
      const albumId = item.dataset.albumId;
      setAlbumFilter(albumId ? parseInt(albumId) : null);
      renderSidebar({ ...state, currentAlbum: albumId ? parseInt(albumId) : null });
    });
  });

  // Create album
  document.getElementById('create-album-btn')?.addEventListener('click', showCreateAlbumModal);

  // Rename
  sidebarEl.querySelectorAll('.album-rename').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showRenameAlbumModal(parseInt(btn.dataset.id));
    });
  });

  // Delete
  sidebarEl.querySelectorAll('.album-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteAlbumConfirm(parseInt(btn.dataset.id));
    });
  });
}

function showCreateAlbumModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Create Album</h3>
      <input type="text" id="new-album-name" placeholder="Album name">
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm">Create</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const input = document.getElementById('new-album-name');
  input.focus();

  const close = () => backdrop.remove();

  document.getElementById('modal-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  const create = async () => {
    const name = input.value.trim();
    if (!name) return;
    try {
      await api.createAlbum(name);
      close();
      loadAlbums();
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById('modal-confirm').addEventListener('click', create);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
}

function showRenameAlbumModal(albumId) {
  const state = getState();
  const album = state.albums.find(a => a.id === albumId);
  if (!album) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Rename Album</h3>
      <input type="text" id="rename-album-name" value="${album.name}">
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm">Rename</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const input = document.getElementById('rename-album-name');
  input.focus();
  input.select();

  const close = () => backdrop.remove();

  document.getElementById('modal-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  const rename = async () => {
    const name = input.value.trim();
    if (!name) return;
    try {
      await api.updateAlbum(albumId, { name });
      close();
      loadAlbums();
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById('modal-confirm').addEventListener('click', rename);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') rename(); });
}

function showDeleteAlbumConfirm(albumId) {
  const state = getState();
  const album = state.albums.find(a => a.id === albumId);
  if (!album) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Delete Album</h3>
      <p>Are you sure you want to delete "${album.name}"? Photos will not be deleted.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm" style="background: var(--color-error);">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();

  document.getElementById('modal-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  document.getElementById('modal-confirm').addEventListener('click', async () => {
    try {
      await api.deleteAlbum(albumId);
      close();
      if (state.currentAlbum === albumId) {
        setAlbumFilter(null);
      }
      loadAlbums();
    } catch (err) {
      alert(err.message);
    }
  });
}

export function showAddToAlbumModal(photoIds) {
  const state = getState();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Add to Album</h3>
      <p class="text-sm text-muted mb-md">${photoIds.length} photo(s) selected</p>
      ${state.albums.length === 0
        ? '<p class="text-muted">No albums yet. Create one first.</p>'
        : `<select id="album-select">
            ${state.albums.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>`
      }
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        ${state.albums.length > 0 ? '<button class="btn btn-primary" id="modal-confirm">Add</button>' : ''}
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();

  document.getElementById('modal-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  document.getElementById('modal-confirm')?.addEventListener('click', async () => {
    const albumId = parseInt(document.getElementById('album-select').value);
    try {
      await api.addPhotosToAlbum(albumId, photoIds);
      close();
      loadAlbums();
    } catch (err) {
      alert(err.message);
    }
  });
}
