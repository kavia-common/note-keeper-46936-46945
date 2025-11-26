//
// Global Notes Store for LightningJS app
// Provides actions: loadNotes, addNote, updateNote, deleteNote, selectNote
// Provides selectors: selectedNote, sortedNotes
// Includes loading/error flags and optional localStorage persistence when no API is configured
//

/**
 * Store design notes:
 * - This store is a minimal, framework-agnostic state container to be used within the LightningJS app.
 * - It exposes PUBLIC_INTERFACE methods for actions and selectors.
 * - Persistence Strategy:
 *    - If VITE_API_BASE (or VITE_BACKEND_URL) is set, we assume an API backend exists and will attempt to use fetch() to persist.
 *    - If no API is configured, it falls back to localStorage persistence under the key 'notes_store_v1'.
 * - Consumers can import the store and call store.subscribe to react to state changes.
 *
 * - State shape:
 *   {
 *     notes: Array<{ id: string, title: string, content: string, updatedAt: number, createdAt: number }>,
 *     selectedNoteId: string | null,
 *     loading: boolean,
 *     error: string | null
 *   }
 */

// Read environment variables exposed by Vite
const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL)) ||
  '';

const USE_API = !!API_BASE;

// LocalStorage key for persistence when API is not configured
const LS_KEY = 'notes_store_v1';

// Utility to generate a simple unique id (not cryptographically secure)
function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  ).toUpperCase();
}

// Internal helper: read from localStorage
function readFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {
    // noop: fallthrough to default
    console.warn('Failed to parse localStorage state:', e);
  }
  return null;
}

// Internal helper: write to localStorage
function writeToLocalStorage(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to write to localStorage:', e);
  }
}

// Internal fetch helpers for API mode
async function apiFetch(path, options = {}) {
  const url = API_BASE.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  const resp = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `Request failed with status ${resp.status}`);
  }
  // try json, fallback to empty
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

// Initial state
const defaultState = {
  notes: [],
  selectedNoteId: null,
  loading: false,
  error: null,
};

// Initialize state (prefer localStorage when no API)
let initialState = { ...defaultState };
if (!USE_API && typeof window !== 'undefined') {
  const persisted = readFromLocalStorage();
  if (persisted) {
    initialState = { ...defaultState, ...persisted };
  }
}

// Simple pub/sub store
class NotesStore {
  constructor(initial) {
    this._state = { ...initial };
    this._subscribers = new Set();
  }

  // PUBLIC_INTERFACE
  subscribe(fn) {
    /** Subscribe to state updates; returns unsubscribe function. */
    this._subscribers.add(fn);
    // emit current state immediately
    try {
      fn(this.getState());
    } catch (e) {
      console.warn('Subscriber threw during immediate emit:', e);
    }
    return () => this._subscribers.delete(fn);
  }

  _emit() {
    if (!USE_API && typeof window !== 'undefined') {
      writeToLocalStorage({
        notes: this._state.notes,
        selectedNoteId: this._state.selectedNoteId,
        loading: this._state.loading,
        error: this._state.error,
      });
    }
    for (const fn of this._subscribers) {
      try {
        fn(this.getState());
      } catch (e) {
        console.warn('Subscriber threw:', e);
      }
    }
  }

  // PUBLIC_INTERFACE
  getState() {
    /** Return a shallow clone of the current state to prevent direct mutation. */
    return { ...this._state, notes: [...this._state.notes] };
  }

  _setState(patch) {
    this._state = { ...this._state, ...patch };
    this._emit();
  }

  // Action helpers to unify loading/error pattern
  async _runAsync(actionName, fn) {
    // set loading true and clear error
    this._setState({ loading: true, error: null });
    try {
      await fn();
    } catch (e) {
      console.error(`${actionName} failed:`, e);
      const message = e && e.message ? e.message : 'Unknown error';
      this._setState({ error: message });
    } finally {
      this._setState({ loading: false });
    }
  }

  // PUBLIC_INTERFACE
  async loadNotes() {
    /**
     * Load notes from API if configured; otherwise load from localStorage (already initialized).
     * If API mode: GET /notes -> [{id,title,content,updatedAt,createdAt}]
     */
    await this._runAsync('loadNotes', async () => {
      if (!USE_API) {
        // local mode: already in state from initialization; still emit to notify listeners
        this._emit();
        return;
      }
      const data = await apiFetch('/notes', { method: 'GET' });
      if (!Array.isArray(data)) {
        throw new Error('Invalid response from server.');
      }
      // validate note structure minimally
      const notes = data
        .filter(n => n && typeof n === 'object')
        .map(n => ({
          id: String(n.id ?? uid()),
          title: String(n.title ?? ''),
          content: String(n.content ?? ''),
          updatedAt: Number(n.updatedAt ?? Date.now()),
          createdAt: Number(n.createdAt ?? Date.now()),
        }));
      this._setState({ notes });
    });
  }

  // PUBLIC_INTERFACE
  async addNote({ title = '', content = '' } = {}) {
    /**
     * Create a new note; in API mode POST /notes; in local mode, write to localStorage.
     * Returns the created note.
     */
    let created = null;
    await this._runAsync('addNote', async () => {
      const base = {
        title: String(title),
        content: String(content),
      };
      if (USE_API) {
        const data = await apiFetch('/notes', {
          method: 'POST',
          body: JSON.stringify(base),
        });
        created = {
          id: String(data?.id ?? uid()),
          title: String(data?.title ?? base.title),
          content: String(data?.content ?? base.content),
          updatedAt: Number(data?.updatedAt ?? Date.now()),
          createdAt: Number(data?.createdAt ?? Date.now()),
        };
      } else {
        const now = Date.now();
        created = {
          id: uid(),
          title: base.title,
          content: base.content,
          createdAt: now,
          updatedAt: now,
        };
      }
      const notes = [...this._state.notes, created];
      this._setState({ notes, selectedNoteId: created.id });
    });
    return created;
  }

  // PUBLIC_INTERFACE
  async updateNote(id, updates = {}) {
    /**
     * Update an existing note; API mode PUT /notes/:id; local mode update in-memory and persist.
     * Returns the updated note.
     */
    if (!id) throw new Error('updateNote requires an id');
    let updated = null;
    await this._runAsync('updateNote', async () => {
      const existing = this._state.notes.find(n => n.id === id);
      if (!existing) throw new Error('Note not found');
      const payload = {
        title: updates.title !== undefined ? String(updates.title) : existing.title,
        content: updates.content !== undefined ? String(updates.content) : existing.content,
      };
      if (USE_API) {
        const data = await apiFetch(`/notes/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        updated = {
          id: String(data?.id ?? id),
          title: String(data?.title ?? payload.title),
          content: String(data?.content ?? payload.content),
          updatedAt: Number(data?.updatedAt ?? Date.now()),
          createdAt: Number(data?.createdAt ?? existing.createdAt ?? Date.now()),
        };
      } else {
        updated = {
          ...existing,
          ...payload,
          updatedAt: Date.now(),
        };
      }
      const notes = this._state.notes.map(n => (n.id === id ? updated : n));
      this._setState({ notes });
    });
    return updated;
  }

  // PUBLIC_INTERFACE
  async deleteNote(id) {
    /**
     * Delete a note; API mode DELETE /notes/:id; local mode remove and persist.
     * Returns true if deleted, false otherwise.
     */
    if (!id) throw new Error('deleteNote requires an id');
    let ok = false;
    await this._runAsync('deleteNote', async () => {
      const exists = this._state.notes.some(n => n.id === id);
      if (!exists) throw new Error('Note not found');
      if (USE_API) {
        await apiFetch(`/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      }
      const notes = this._state.notes.filter(n => n.id !== id);
      const selectedNoteId =
        this._state.selectedNoteId === id ? (notes[0]?.id ?? null) : this._state.selectedNoteId;
      this._setState({ notes, selectedNoteId });
      ok = true;
    });
    return ok;
  }

  // PUBLIC_INTERFACE
  selectNote(id) {
    /**
     * Select a note by id (does not persist).
     */
    if (id == null) {
      this._setState({ selectedNoteId: null });
      return;
    }
    const exists = this._state.notes.some(n => n.id === id);
    if (!exists) {
      // If note not found, keep selection unchanged but set error
      this._setState({ error: 'Note not found' });
      return;
    }
    this._setState({ selectedNoteId: id });
  }

  // PUBLIC_INTERFACE
  selectedNote() {
    /**
     * Selector: returns the currently selected note object or null
     */
    const id = this._state.selectedNoteId;
    if (!id) return null;
    return this._state.notes.find(n => n.id === id) || null;
  }

  // PUBLIC_INTERFACE
  sortedNotes() {
    /**
     * Selector: returns notes sorted by updatedAt desc, then title asc.
     */
    return [...this._state.notes].sort((a, b) => {
      const t = (b.updatedAt || 0) - (a.updatedAt || 0);
      if (t !== 0) return t;
      const ta = (a.title || '').toLowerCase();
      const tb = (b.title || '').toLowerCase();
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });
  }

  // PUBLIC_INTERFACE
  isLoading() {
    /** Selector: returns loading flag */
    return !!this._state.loading;
  }

  // PUBLIC_INTERFACE
  getError() {
    /** Selector: returns current error string or null */
    return this._state.error;
  }
}

// Singleton store instance
export const store = new NotesStore(initialState);

// PUBLIC_INTERFACE
export function useNotesStore() {
  /** Accessor to the singleton notes store instance. */
  return store;
}
