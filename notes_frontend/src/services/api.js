const API_BASE = import.meta?.env?.VITE_API_BASE;

/**
 * Small helper to normalize errors and ensure a consistent error object.
 * Wraps any thrown value into an Error instance with message and optional cause.
 */
function toError(err, fallbackMessage = "Unexpected error") {
  if (err instanceof Error) return err;
  try {
    const asString = typeof err === "string" ? err : JSON.stringify(err);
    return new Error(asString || fallbackMessage);
  } catch {
    return new Error(fallbackMessage);
  }
}

/**
 * HTTP helper wrapping fetch with JSON handling and clearer errors.
 * - Adds JSON headers for non-GET
 * - Serializes body when provided
 * - Parses JSON responses when possible
 * - Throws Error with status and body info for non-2xx
 */
async function http(method, path, body) {
  const url = `${API_BASE}${path}`;
  const init = {
    method,
    headers: {
      Accept: "application/json",
    },
  };

  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw toError(e, "Network error while contacting API");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  let data;
  try {
    data = isJson ? await res.json() : await res.text();
  } catch (e) {
    // If parsing fails, keep data undefined; still allow status checks below.
    data = undefined;
  }

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.message || `Request failed with status ${res.status}`;
    const error = new Error(msg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Create a small utility for simulating latency in the mock repository.
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Keys and default seed for mock store
const LS_KEY = "notes_mock_store_v1";
const DEFAULT_SEED = [
  {
    id: "1",
    title: "Welcome to Notes",
    content: "This is your first note. You can edit or delete it.",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Second note",
    content: "Keep track of ideas, todos, and more.",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

/**
 * Ensures localStorage has an initialized store and returns it.
 */
function readStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_SEED));
      return [...DEFAULT_SEED];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_SEED));
      return [...DEFAULT_SEED];
    }
    return parsed;
  } catch {
    // In case of storage issues, just fallback to in-memory default for current session
    return [...DEFAULT_SEED];
  }
}

function writeStore(notes) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(notes));
  } catch {
    // Ignore write errors gracefully (e.g., storage full or disabled)
  }
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Mock repository with simulated latency and basic CRUD logic.
 * Latency defaults to 300ms; can be tuned by VITE_API_MOCK_LATENCY if desired.
 */
const MOCK_LATENCY = Number(import.meta?.env?.VITE_API_MOCK_LATENCY || 300);

const mockRepo = {
  async list() {
    await delay(MOCK_LATENCY);
    const notes = readStore();
    // Return a shallow copy to avoid accidental mutations
    return notes.map((n) => ({ ...n }));
  },

  async create(payload) {
    await delay(MOCK_LATENCY);
    const notes = readStore();
    const now = new Date().toISOString();
    const newNote = {
      id: generateId(),
      title: payload?.title ?? "Untitled",
      content: payload?.content ?? "",
      createdAt: now,
      updatedAt: now,
    };
    notes.unshift(newNote);
    writeStore(notes);
    return { ...newNote };
  },

  async patch(id, payload) {
    await delay(MOCK_LATENCY);
    if (!id) throw new Error("Note ID is required");
    const notes = readStore();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) {
      const e = new Error("Note not found");
      e.status = 404;
      throw e;
    }
    const now = new Date().toISOString();
    const updated = {
      ...notes[idx],
      ...(payload || {}),
      updatedAt: now,
    };
    notes[idx] = updated;
    writeStore(notes);
    return { ...updated };
  },

  async remove(id) {
    await delay(MOCK_LATENCY);
    if (!id) throw new Error("Note ID is required");
    const notes = readStore();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) {
      const e = new Error("Note not found");
      e.status = 404;
      throw e;
    }
    const [removed] = notes.splice(idx, 1);
    writeStore(notes);
    return { ...removed };
  },
};

// Decide mode based on VITE_API_BASE presence
const isRealApi = typeof API_BASE === "string" && API_BASE.trim().length > 0;

/**
 * Build the real API client when VITE_API_BASE is provided.
 */
function createRealApi() {
  return {
    /**
     * PUBLIC_INTERFACE
     * Fetch all notes from backend.
     * Returns: Promise<Note[]>
     */
    async fetchNotes() {
      try {
        return await http("GET", "/notes");
      } catch (e) {
        throw toError(e, "Failed to fetch notes");
      }
    },

    /**
     * PUBLIC_INTERFACE
     * Create a note on the backend.
     * Params: { title?: string, content?: string }
     * Returns: Promise<Note>
     */
    async createNote(payload) {
      try {
        return await http("POST", "/notes", payload || {});
      } catch (e) {
        throw toError(e, "Failed to create note");
      }
    },

    /**
     * PUBLIC_INTERFACE
     * Partially update a note by id.
     * Params: id: string, payload: Partial<Note>
     * Returns: Promise<Note>
     */
    async patchNote(id, payload) {
      try {
        if (!id) throw new Error("Note ID is required");
        return await http("PATCH", `/notes/${encodeURIComponent(id)}`, payload || {});
      } catch (e) {
        throw toError(e, "Failed to update note");
      }
    },

    /**
     * PUBLIC_INTERFACE
     * Remove a note by id.
     * Params: id: string
     * Returns: Promise<{id: string} | Note | void> depending on API
     */
    async removeNote(id) {
      try {
        if (!id) throw new Error("Note ID is required");
        return await http("DELETE", `/notes/${encodeURIComponent(id)}`);
      } catch (e) {
        throw toError(e, "Failed to delete note");
      }
    },
  };
}

/**
 * Build the mock API client when VITE_API_BASE is not provided.
 */
function createMockApi() {
  return {
    /**
     * PUBLIC_INTERFACE
     * Fetch all notes from local mock storage.
     * Returns: Promise<Note[]>
     */
    async fetchNotes() {
      try {
        return await mockRepo.list();
      } catch (e) {
        throw toError(e, "Failed to fetch notes (mock)");
      }
    },

    /**
     * PUBLIC_INTERFACE
     * Create a note in local mock storage.
     * Params: { title?: string, content?: string }
     * Returns: Promise<Note>
     */
    async createNote(payload) {
      try {
        return await mockRepo.create(payload || {});
      } catch (e) {
        throw toError(e, "Failed to create note (mock)");
      }
    },

    /**
     * PUBLIC_INTERFACE
     * Partially update a note by id in local mock storage.
     * Params: id: string, payload: Partial<Note>
     * Returns: Promise<Note>
     */
    async patchNote(id, payload) {
      try {
        return await mockRepo.patch(id, payload || {});
      } catch (e) {
        throw toError(e, "Failed to update note (mock)");
      }
    },

    /**
     * PUBLIC_INTERFACE
     * Remove a note by id from local mock storage.
     * Params: id: string
     * Returns: Promise<Note>
     */
    async removeNote(id) {
      try {
        return await mockRepo.remove(id);
      } catch (e) {
        throw toError(e, "Failed to delete note (mock)");
      }
    },
  };
}

const api = isRealApi ? createRealApi() : createMockApi();

// PUBLIC_INTERFACE
export async function fetchNotes() {
  /** Fetches all notes. Uses remote API if configured, otherwise mock storage. */
  return api.fetchNotes();
}

// PUBLIC_INTERFACE
export async function createNote(payload) {
  /** Creates a new note. Uses remote API if configured, otherwise mock storage. */
  return api.createNote(payload);
}

// PUBLIC_INTERFACE
export async function patchNote(id, payload) {
  /** Partially updates a note by id. Uses remote API if configured, otherwise mock storage. */
  return api.patchNote(id, payload);
}

// PUBLIC_INTERFACE
export async function removeNote(id) {
  /** Removes a note by id. Uses remote API if configured, otherwise mock storage. */
  return api.removeNote(id);
}
