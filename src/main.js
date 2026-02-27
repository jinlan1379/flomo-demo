import './styles/main.css';
import { api } from './services/api.js';
import { renderGallery, updateGallery } from './components/gallery.js';
import { renderLightbox } from './components/lightbox.js';
import { renderSidebar } from './components/sidebar.js';
import { renderSearchBar } from './components/search-bar.js';

// App state
const state = {
  photos: [],
  albums: [],
  tags: [],
  currentAlbum: null,
  searchQuery: '',
  searchTag: '',
  selectedPhotos: new Set(),
  selectMode: false,
  sort: 'date',
  order: 'desc',
  page: 1,
  limit: 50,
  total: 0,
};

export function getState() { return state; }

export async function loadPhotos() {
  const params = {
    sort: state.sort,
    order: state.order,
    page: state.page,
    limit: state.limit,
  };
  if (state.currentAlbum) params.album_id = state.currentAlbum;
  if (state.searchTag) params.tag = state.searchTag;
  if (state.searchQuery) params.search = state.searchQuery;

  const data = await api.getPhotos(params);
  state.photos = data.photos;
  state.total = data.total;
  updateGallery(state);
}

export async function loadAlbums() {
  const data = await api.getAlbums();
  state.albums = data.albums;
  renderSidebar(state);
}

export async function loadTags() {
  const data = await api.getTags();
  state.tags = data.tags;
}

export function setAlbumFilter(albumId) {
  state.currentAlbum = albumId;
  state.page = 1;
  loadPhotos();
}

export function setSearch(query, tag) {
  if (query !== undefined) state.searchQuery = query;
  if (tag !== undefined) state.searchTag = tag;
  state.page = 1;
  loadPhotos();
}

export function setSort(sort, order) {
  state.sort = sort;
  if (order) state.order = order;
  state.page = 1;
  loadPhotos();
}

export function setPage(page) {
  state.page = page;
  loadPhotos();
}

export function toggleSelectMode() {
  state.selectMode = !state.selectMode;
  state.selectedPhotos.clear();
  updateGallery(state);
}

export function togglePhotoSelection(photoId) {
  if (state.selectedPhotos.has(photoId)) {
    state.selectedPhotos.delete(photoId);
  } else {
    state.selectedPhotos.add(photoId);
  }
  updateGallery(state);
}

export function openPhoto(photo) {
  renderLightbox(photo, state);
}

// Initialize
async function init() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="sidebar" id="sidebar"></div>
    <div class="main-content">
      <div class="header" id="header"></div>
      <div class="gallery-container" id="gallery-container">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  try {
    // Request persistent storage
    if (navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }

    // Scan for photos on first load
    await api.scan();

    // Load data
    await Promise.all([loadPhotos(), loadAlbums(), loadTags()]);

    // Render initial UI
    renderSearchBar();
    renderGallery(state);
    renderSidebar(state);
  } catch (err) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = `
      <div class="error-message">
        Failed to initialize: ${err.message}
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', init);
