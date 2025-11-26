import { Component, Lightning } from '@lightningjs/blits';
import { theme } from '../theme';
import Loader from '../components/Loader';
import Sidebar from '../components/Sidebar';
import NoteListItem from '../components/NoteListItem';
import { store } from '../state/store';

/**
 * Global keyboard shortcut handler
 * - Ctrl/Cmd+N: Add new note and select it
 * - Ctrl/Cmd+S: Save/update current note (no-op if nothing changed)
 * - Delete: Delete currently selected note
 * - Up/Down: Navigate the sidebar list
 */
function installGlobalShortcuts(ctx) {
  if (typeof window === 'undefined') return () => {};
  const handler = async (e) => {
    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;

    // if focus is inside a text input area (HTML/native), do not hijack
    const ae = document.activeElement;
    const isTyping =
      ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);

    // Ctrl/Cmd + N: Add note
    if (ctrl && (key === 'n' || key === 'N')) {
      e.preventDefault();
      if (store.addNote) {
        const created = await store.addNote({ title: 'Untitled', content: '' });
        if (created?.id) store.selectNote(created.id);
      }
      return;
    }

    // Ctrl/Cmd + S: Save note
    if (ctrl && (key === 's' || key === 'S')) {
      e.preventDefault();
      const note = store.selectedNote ? store.selectedNote() : null;
      if (note && store.updateNote) {
        // In this minimal implementation we assume editor updates store live,
        // so save acts as "touch update" to refresh updatedAt.
        await store.updateNote(note.id, { title: note.title, content: note.content });
      }
      return;
    }

    // Delete: Delete selected note (avoid if actively typing in an input area)
    if (!ctrl && key === 'Delete' && !isTyping) {
      const current = store.selectedNote ? store.selectedNote() : null;
      if (current && store.deleteNote) {
        // eslint-disable-next-line no-restricted-globals
        const ok = window.confirm('Delete the selected note? This cannot be undone.');
        if (ok) await store.deleteNote(current.id);
      }
      return;
    }

    // Up/Down: route to Sidebar for list navigation
    if (!isTyping && (key === 'ArrowUp' || key === 'ArrowDown')) {
      const sidebar = ctx.tag && ctx.tag('Body.SidebarHolder');
      if (sidebar && typeof sidebar._handleKey === 'function') {
        // Fake an event payload to reuse handlers in Sidebar
        sidebar._handleKey({ key });
        e.preventDefault();
      }
    }
  };
  window.addEventListener('keydown', handler, { passive: false });
  return () => window.removeEventListener('keydown', handler);
}

/**
 * PUBLIC_INTERFACE
 * NotesLayout
 * Application shell: header, sidebar with notes list, and main content area.
 * Integrates Sidebar with global store: renders sortedNotes, highlights selected note, supports selection and delete.
 */
export default class NotesLayout extends Component {
  static template() {
    const headerHeight = 80;
    const sidebarWidth = 420;

    return {
      w: 1920,
      h: 1080,
      rect: true,
      color: theme.backgroundColor,

      TopShade: {
        w: 1920,
        h: 180,
        rect: true,
        color: theme.surfaceMuted,
        alpha: 0.55,
      },

      Header: {
        x: 0,
        y: 0,
        w: 1920,
        h: headerHeight,
        rect: true,
        color: theme.surface,
        shader: { type: Lightning.shaders.RoundedRectangle, radius: 0 },
        BottomBorder: {
          x: 0,
          y: headerHeight - 2,
          w: 1920,
          h: 2,
          rect: true,
          color: theme.surfaceBorder,
        },
        Title: {
          x: 40,
          y: Math.floor(headerHeight / 2),
          mountY: 0.5,
          text: {
            text: 'Notes',
            fontSize: 36,
            textColor: theme.textPrimary,
            fontFace: 'Regular',
          },
        },
        Actions: {
          x: 1920 - 40,
          y: Math.floor(headerHeight / 2),
          mount: 1,
          AddNoteSlot: {},
        },
      },

      Body: {
        x: 0,
        y: headerHeight,
        w: 1920,
        h: 1080 - headerHeight,
        rect: false,

        SidebarHolder: {
          x: 16,
          y: 16,
          w: sidebarWidth - 32,
          h: (1080 - headerHeight) - 32,
          type: Sidebar,
        },

        Content: {
          x: sidebarWidth + 16,
          y: 16,
          w: 1920 - (sidebarWidth + 32),
          h: (1080 - headerHeight) - 32,
          rect: true,
          color: theme.surface,
          shader: { type: Lightning.shaders.RoundedRectangle, radius: 12 },
          LeftBorder: {
            x: 0,
            y: 0,
            w: 1,
            h: (1080 - headerHeight) - 32,
            rect: true,
            color: theme.surfaceBorder,
          },
          NoteEditorSlot: {
            x: 24,
            y: 16,
            w: (1920 - (sidebarWidth + 32)) - 48,
            h: (1080 - headerHeight) - (32 + 32),
            clipping: true,
          },
          EmptyHint: {
            mount: 0.5,
            x: ((1920 - (sidebarWidth + 32)) - 48) / 2,
            y: ((1080 - headerHeight) - (32 + 32)) / 2,
            text: {
              text: 'Select or create a note',
              fontSize: 28,
              textColor: theme.textSecondary,
            },
          },
        },
      },

      Overlays: {
        w: 1920,
        h: 1080,
        rect: false,
        LoadingHolder: {
          x: 0,
          y: 0,
          w: 1920,
          h: 1080,
          rect: false,
          LoaderSlot: {},
        },
        ErrorHolder: {
          x: 0,
          y: 0,
          w: 1920,
          h: 1080,
          rect: false,
          visible: false,
          ErrorCard: {
            x: 960,
            y: 540,
            mount: 0.5,
            w: 560,
            h: 220,
            rect: true,
            color: theme.errorSurface,
            shader: { type: Lightning.shaders.RoundedRectangle, radius: 12 },
            Title: {
              x: 24,
              y: 24,
              text: {
                text: 'Load Error',
                fontSize: 28,
                textColor: theme.errorText,
              },
            },
            Message: {
              x: 24,
              y: 70,
              w: 512,
              text: {
                text: 'Something went wrong while loading your notes.',
                wordWrap: true,
                wordWrapWidth: 512,
                fontSize: 22,
                textColor: theme.textSecondary,
              },
            },
            Hint: {
              x: 24,
              y: 150,
              text: {
                text: 'Press Enter to retry',
                fontSize: 20,
                textColor: theme.textSecondary,
              },
            },
          },
        },
      },
    };
  }

  _setup() {
    this._unsubscribe = store.subscribe((state) => {
      const loading = store.isLoading?.() ?? state.loading;
      const error = store.getError?.() ?? state.error;
      this._setLoading(!!loading);
      this._setError(Boolean(error));
      this._renderSidebarList();
    });

    this.tag('Overlays.LoadingHolder.LoaderSlot').children = [
      { type: Loader, passProps: { label: 'Loading notes...' } },
    ];

    this._setLoading(true);

    // Install global keyboard shortcuts
    this._uninstallShortcuts = installGlobalShortcuts(this);
  }

  async ready() {
    try {
      if (store.loadNotes) {
        await store.loadNotes();
      }
    } catch (e) {
      console.error('Failed to load notes:', e);
    }
  }

  _detach() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._uninstallShortcuts) {
      this._uninstallShortcuts();
      this._uninstallShortcuts = null;
    }
  }

  _setLoading(isLoading) {
    const holder = this.tag('Overlays.LoadingHolder');
    if (holder) holder.visible = !!isLoading;
  }

  _setError(hasError) {
    const holder = this.tag('Overlays.ErrorHolder');
    if (holder) holder.visible = !!hasError;
  }

  _getFocused() {
    const sidebar = this.tag('Body.SidebarHolder');
    if (sidebar && sidebar._refocus) return sidebar;
    const editor = this.tag('Body.Content.NoteEditorSlot').children?.[0];
    if (editor && editor._refocus) return editor;
    return this;
  }

  _renderSidebarList() {
    const sidebar = this.tag('Body.SidebarHolder');
    if (!sidebar) return;

    const notes = typeof store.sortedNotes === 'function' ? store.sortedNotes() : (store.getState?.().notes || []);
    const selectedId = store.getState?.().selectedNoteId ?? null;

    // Patch Sidebar's internal list using NoteListItem components
    const items = notes.map((note, idx) => ({
      type: NoteListItem,
      note,
      index: idx,
      active: note.id === selectedId,
      y: idx * 72,
      onSelectHandler: (noteId) => {
        if (store.selectNote) store.selectNote(noteId);
      },
      onDeleteHandler: async (noteId) => {
        // Confirm handled in NoteListItem; ensure store deletion
        if (store.deleteNote) await store.deleteNote(noteId);
      },
    }));

    // Access Sidebar's internal ListWrapper/Items area
    const listWrapper = sidebar.tag && sidebar.tag('ListWrapper');
    if (listWrapper && listWrapper.tag) {
      listWrapper.tag('Items').children = items;
      // Ensure scrollbar updates
      if (sidebar._updateScrollbar) sidebar._updateScrollbar();
    } else {
      // As a fallback, repatch the sidebar to include items if structure differs
      sidebar.patch({
        ListWrapper: {
          Items: {
            children: items,
          },
        },
      });
    }
  }

  _handleEnter() {
    const error = store.getError?.();
    if (error) {
      if (store.clearNotesError) store.clearNotesError();
      this.ready();
      return true;
    }
    return false;
  }
}
