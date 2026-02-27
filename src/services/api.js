const BASE = '/api';

async function request(method, path, body) {
  const options = {
    method,
    headers: {},
  };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, options);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  // Photos
  getPhotos(params = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') qs.set(k, v);
    }
    const query = qs.toString();
    return request('GET', `/photos${query ? `?${query}` : ''}`);
  },
  getPhoto(id) {
    return request('GET', `/photos/${id}`);
  },
  updatePhoto(id, data) {
    return request('PATCH', `/photos/${id}`, data);
  },

  // Tags
  addTags(photoId, tags) {
    return request('POST', `/photos/${photoId}/tags`, { tags });
  },
  removeTag(photoId, tagName) {
    return request('DELETE', `/photos/${photoId}/tags/${encodeURIComponent(tagName)}`);
  },
  getTags() {
    return request('GET', '/tags');
  },

  // Albums
  getAlbums() {
    return request('GET', '/albums');
  },
  createAlbum(name, description) {
    return request('POST', '/albums', { name, description });
  },
  updateAlbum(id, data) {
    return request('PATCH', `/albums/${id}`, data);
  },
  deleteAlbum(id) {
    return request('DELETE', `/albums/${id}`);
  },
  addPhotosToAlbum(albumId, photoIds) {
    return request('POST', `/albums/${albumId}/photos`, { photo_ids: photoIds });
  },
  removePhotoFromAlbum(albumId, photoId) {
    return request('DELETE', `/albums/${albumId}/photos/${photoId}`);
  },

  // Scanning
  scan() {
    return request('POST', '/scan');
  },
};
