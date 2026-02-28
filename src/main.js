import './styles/main.css';
import { api } from './services/api.js';
import { renderGallery, updateGallery } from './components/gallery.js';
import { renderLightbox } from './components/lightbox.js';
import { renderSidebar } from './components/sidebar.js';
import { renderSearchBar } from './components/search-bar.js';
import { renderTagSidebar } from './components/tag-sidebar.js';
import { renderTagFilter } from './components/tag-filter.js';
import { renderNoteList } from './components/note-list.js';
import { openNoteEditor } from './components/note-editor.js';

// App state
const state = {
  // Photos / Albums
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

  // View: 'photos' | 'notes'
  view: 'photos',

  // Notes
  notes: [],
  allNoteTags: [],    // [{ name, noteCount, photoCount }]
  activeNoteTag: null,
};

export function getState() { return state; }

// --- Photos ---

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

// --- Notes ---

export async function loadNotes() {
  const data = await api.getNotes();
  state.notes = data.notes;
  renderNotesView();
}

export async function loadNoteTags() {
  const data = await api.getTags();
  // Filter to tags that have at least one note (plus keep all for completeness)
  state.allNoteTags = data.tags.filter(t => t.noteCount > 0);
  renderNoteTagSidebar();
}

export function setNoteTagFilter(tag) {
  state.activeNoteTag = tag || null;
  renderNotesView();
  renderNoteTagSidebar();
}

async function addTagToNote(noteId, tag) {
  await api.addNoteTags(noteId, [tag]);
  await Promise.all([loadNotes(), loadNoteTags()]);
}

async function removeTagFromNote(noteId, tag) {
  await api.removeNoteTag(noteId, tag);
  await Promise.all([loadNotes(), loadNoteTags()]);
}

// --- View switching ---

export function setView(view) {
  state.view = view;

  const galleryContainer = document.getElementById('gallery-container');
  const notesContainer = document.getElementById('notes-container');
  const sidebarEl = document.getElementById('sidebar');

  if (view === 'notes') {
    galleryContainer?.classList.add('hidden');
    notesContainer?.classList.remove('hidden');
    renderNoteTagSidebar();
    renderNotesView();
  } else {
    notesContainer?.classList.add('hidden');
    galleryContainer?.classList.remove('hidden');
    renderSidebar(state);
  }

  // Update tab active state
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
}

// --- Notes rendering helpers ---

function renderNoteTagSidebar() {
  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) return;

  if (state.view !== 'notes') return;

  // Preserve the view switcher at the top
  const switcher = sidebarEl.querySelector('.view-switcher');

  sidebarEl.innerHTML = '';
  if (switcher) sidebarEl.appendChild(switcher);

  const tagSidebarContainer = document.createElement('div');
  tagSidebarContainer.style.flex = '1';
  tagSidebarContainer.style.overflow = 'hidden';
  tagSidebarContainer.style.display = 'flex';
  tagSidebarContainer.style.flexDirection = 'column';
  sidebarEl.appendChild(tagSidebarContainer);

  renderTagSidebar(tagSidebarContainer, {
    tags: state.allNoteTags,
    activeTag: state.activeNoteTag,
    onSelect(tag) {
      setNoteTagFilter(tag);
    },
  });
}

function renderNotesView() {
  const container = document.getElementById('notes-container');
  if (!container) return;

  container.innerHTML = '';

  // Tag filter bar (inserted at top by renderTagFilter)
  renderTagFilter(container, {
    activeTag: state.activeNoteTag,
    onClear() { setNoteTagFilter(null); },
  });

  // Notes header with "New Note" button
  const header = document.createElement('div');
  header.className = 'notes-header';
  header.innerHTML = `<button class="btn btn-primary btn-sm" id="new-note-btn">+ New Note</button>`;
  container.appendChild(header);

  header.querySelector('#new-note-btn').addEventListener('click', () => {
    openNoteEditor({
      note: null,
      allTags: state.allNoteTags.map(t => t.name),
      onSave() {
        Promise.all([loadNotes(), loadNoteTags()]);
      },
      onCancel() {},
    });
  });

  // Note list wrapper
  const listWrapper = document.createElement('div');
  listWrapper.className = 'note-list-wrapper';
  container.appendChild(listWrapper);

  renderNoteList(listWrapper, {
    notes: state.notes,
    filterTag: state.activeNoteTag,
    onSelect(note) {
      openNoteEditor({
        note,
        allTags: state.allNoteTags.map(t => t.name),
        onSave() {
          Promise.all([loadNotes(), loadNoteTags()]);
        },
        onCancel() {},
      });
    },
    async onDelete(noteId) {
      if (!confirm('Delete this note?')) return;
      try {
        await api.deleteNote(noteId);
        await Promise.all([loadNotes(), loadNoteTags()]);
      } catch (err) {
        alert(err.message);
      }
    },
  });
}

// --- View switcher (injected into sidebar) ---

function renderViewSwitcher(sidebarEl) {
  const existing = sidebarEl.querySelector('.view-switcher');
  if (existing) return;

  const switcher = document.createElement('div');
  switcher.className = 'view-switcher';
  switcher.innerHTML = `
    <button class="view-tab${state.view === 'photos' ? ' active' : ''}" data-view="photos">Photos</button>
    <button class="view-tab${state.view === 'notes' ? ' active' : ''}" data-view="notes">Notes</button>
  `;
  switcher.addEventListener('click', (e) => {
    const tab = e.target.closest('.view-tab');
    if (tab) setView(tab.dataset.view);
  });
  sidebarEl.insertBefore(switcher, sidebarEl.firstChild);
}

// --- Initialize ---

async function init() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="sidebar" id="sidebar"></div>
    <div class="main-content">
      <div class="header" id="header"></div>
      <div class="gallery-container" id="gallery-container">
        <div class="loading"><div class="spinner"></div></div>
      </div>
      <div class="notes-container hidden" id="notes-container"></div>
    </div>
  `;

  try {
    // Request persistent storage
    if (navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }

    // Scan for photos on first load
    await api.scan();

    // Load all data in parallel
    await Promise.all([loadPhotos(), loadAlbums(), loadTags(), loadNotes(), loadNoteTags()]);

    // Render initial UI
    renderSearchBar();
    renderGallery(state);

    // Inject view switcher into sidebar (sidebar already rendered by loadAlbums → renderSidebar)
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) renderViewSwitcher(sidebarEl);
  } catch (err) {
    const container = document.getElementById('gallery-container');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          Failed to initialize: ${err.message}
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
