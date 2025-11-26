import { Component, Lightning } from '@lightningjs/blits';
import store from '../state/store';
import { theme } from '../theme';
import Loader from '../components/Loader';

/**
 * PUBLIC_INTERFACE
 * NotesLayout
 * This page component provides the main application shell for the Notes app.
 * It renders:
 *  - A top header with the app title and an "Add Note" action slot
 *  - A left sidebar area for the NotesIndex (notes list)
 *  - A main content area for the NoteEditor (selected note view)
 * On ready(), it dispatches a loadNotes action to hydrate the store.
 * It handles loading and error states gracefully, and exposes slots for child components.
 */
export default class NotesLayout extends Component {
  static template() {
    const headerHeight = 80;
    const sidebarWidth = 420;

    return {
      w: 1920,
      h: 1080,
      rect: true,
      color: theme.backgroundColor, // overall app background

      // Gradient-like subtle top overlay
      TopShade: {
        w: 1920,
        h: 180,
        rect: true,
        color: theme.surfaceMuted,
        alpha: 0.55,
      },

      // Header bar
      Header: {
        x: 0,
        y: 0,
        w: 1920,
        h: headerHeight,
        rect: true,
        color: theme.surface,
        shader: { type: Lightning.shaders.RoundedRectangle, radius: 0 },

        // subtle bottom border
        BottomBorder: {
          x: 0,
          y: headerHeight - 2,
          w: 1920,
          h: 2,
          rect: true,
          color: theme.surfaceBorder,
        },

        // Title
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

        // Action slot holder (e.g., Add Note button)
        Actions: {
          x: 1920 - 40,
          y: Math.floor(headerHeight / 2),
          mount: 1, // right align
          // Slot node, child components can patch into this
          AddNoteSlot: {
            // placeholder; actual content is injected by a child
          },
        },
      },

      // Body container (sidebar + content)
      Body: {
        x: 0,
        y: headerHeight,
        w: 1920,
        h: 1080 - headerHeight,
        rect: false,

        // Sidebar
        Sidebar: {
          x: 0,
          y: 0,
          w: sidebarWidth,
          h: 1080 - headerHeight,
          rect: true,
          color: theme.surface,
          shader: { type: Lightning.shaders.RoundedRectangle, radius: 0 },

          // Sidebar header
          SidebarHeader: {
            x: 24,
            y: 20,
            text: {
              text: 'All Notes',
              fontSize: 26,
              textColor: theme.textPrimary,
            },
          },

          // Divider
          Divider: {
            x: 0,
            y: 64,
            w: sidebarWidth,
            h: 1,
            rect: true,
            color: theme.surfaceBorder,
            alpha: 0.65,
          },

          // Slot where NotesIndex will be rendered
          NotesIndexSlot: {
            x: 0,
            y: 72,
            w: sidebarWidth,
            h: (1080 - headerHeight) - 72,
            clipping: true,
          },
        },

        // Main Content area
        Content: {
          x: sidebarWidth + 1,
          y: 0,
          w: 1920 - (sidebarWidth + 1),
          h: 1080 - headerHeight,
          rect: true,
          color: theme.surface,
          shader: { type: Lightning.shaders.RoundedRectangle, radius: 0 },

          // subtle left border to separate from sidebar
          LeftBorder: {
            x: 0,
            y: 0,
            w: 1,
            h: 1080 - headerHeight,
            rect: true,
            color: theme.surfaceBorder,
          },

          // Slot where NoteEditor will be rendered
          NoteEditorSlot: {
            x: 24,
            y: 16,
            w: (1920 - (sidebarWidth + 1)) - 48,
            h: (1080 - headerHeight) - 32,
            clipping: true,
          },
        },
      },

      // Overlays for loader or error
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
          // Loader component is shown while notes load
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

  /**
   * Lifecycle: on component initialization bind to store state.
   */
  _setup() {
    // Map store state needed for UI
    this._unsubscribe = store.subscribe((state) => {
      const { loading, error } = state.notes || {};
      this._setLoading(!!loading);
      this._setError(Boolean(error));
    });

    // Prepare a loader instance in the overlay
    this.tag('Overlays.LoadingHolder.LoaderSlot').children = [
      { type: Loader, passProps: { label: 'Loading notes...' } },
    ];

    // Initially hidden as we will be in loading=true until ready() dispatch finishes
    this._setLoading(true);
  }

  /**
   * Lifecycle: called when component becomes active/visible.
   * Dispatches store.loadNotes() to fetch/hydrate the notes set.
   */
  async ready() {
    // PUBLIC_INTERFACE
    // Trigger the notes loading sequence
    try {
      await store.loadNotes();
    } catch (e) {
      // error state is handled by store subscription; keep a console note
      console.error('Failed to load notes:', e);
    }
  }

  /**
   * Clean up store subscription.
   */
  _detach() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  /**
   * Toggle loading overlay visibility.
   */
  _setLoading(isLoading) {
    const holder = this.tag('Overlays.LoadingHolder');
    if (holder) {
      holder.visible = !!isLoading;
    }
  }

  /**
   * Toggle error overlay visibility.
   */
  _setError(hasError) {
    const holder = this.tag('Overlays.ErrorHolder');
    if (holder) {
      holder.visible = !!hasError;
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Injects a component into the "Add Note" header slot.
   * @param {object} comp - Lightning component or patch object for the action area.
   */
  setHeaderAction(comp) {
    this.tag('Header.Actions.AddNoteSlot').children = [comp];
  }

  /**
   * PUBLIC_INTERFACE
   * Mount the NotesIndex component into the sidebar slot.
   * @param {object} comp - Component class or patch node for the notes list.
   */
  setNotesIndex(comp) {
    this.tag('Body.Sidebar.NotesIndexSlot').children = [comp];
  }

  /**
   * PUBLIC_INTERFACE
   * Mount the NoteEditor component into the content slot.
   * @param {object} comp - Component class or patch node for the editor.
   */
  setNoteEditor(comp) {
    this.tag('Body.Content.NoteEditorSlot').children = [comp];
  }

  /**
   * Handle Enter/OK to retry on error.
   */
  _handleEnter() {
    const { notes } = store.getState();
    if (notes?.error) {
      store.clearNotesError?.();
      this.ready();
      return true;
    }
    return false;
  }

  /**
   * Focus behavior defaults to the sidebar (NotesIndex) if available,
   * otherwise to the editor if provided.
   */
  _getFocused() {
    const notesIndex = this.tag('Body.Sidebar.NotesIndexSlot').children?.[0];
    if (notesIndex && notesIndex._refocus) {
      return notesIndex;
    }
    const editor = this.tag('Body.Content.NoteEditorSlot').children?.[0];
    if (editor && editor._refocus) {
      return editor;
    }
    return this;
  }
}
