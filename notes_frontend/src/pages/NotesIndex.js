import lng from '@lightningjs/core';
import store from '../state/store';
import theme from '../theme';
import EmptyState from '../components/EmptyState';

/**
 * NotesIndex page
 * Renders a read-only view of the selected note. If no notes or none selected,
 * renders EmptyState. Provides an Edit button to switch into editor mode via
 * a store/state signal or callback.
 */
export default class NotesIndex extends lng.Component {
  static _template() {
    return {
      w: w => w,
      h: h => h,
      rect: true,
      color: 0xFFFFFFFF, // surface
      Wrapper: {
        x: 48,
        y: 48,
        Title: {
          text: { text: '', fontSize: 44, textColor: 0xFF111827, maxLines: 2, wordWrapWidth: w => w - 96 }
        },
        Meta: {
          y: 64,
          text: { text: '', fontSize: 20, textColor: 0x99111827 }
        },
        Content: {
          y: 120,
          text: { text: '', fontSize: 26, textColor: 0xE0111827, wordWrapWidth: w => w - 96, lineHeight: 42, maxLines: 20 }
        },
        EditBtn: {
          y: 16,
          mountY: 0,
          x: w => (w - 48 - 160),
          rect: true,
          w: 160,
          h: 52,
          color: 0xFF2563EB,
          shader: { type: lng.shaders.RoundedRectangle, radius: 10 },
          Label: {
            mount: 0.5,
            x: 80,
            y: 26,
            text: { text: 'Edit', fontSize: 22, textColor: 0xFFFFFFFF }
          },
          FocusRing: {
            alpha: 0,
            mount: 0.5,
            x: 80,
            y: 26,
            rect: true,
            w: 180,
            h: 62,
            color: 0x1A2563EB,
            shader: { type: lng.shaders.RoundedRectangle, radius: 14 }
          }
        }
      }
    };
  }

  _construct() {
    this._unsubscribe = null;
    this._selectedNote = null;
    this._onEdit = null;
  }

  _init() {
    // Subscribe to store updates
    if (store.subscribe) {
      this._unsubscribe = store.subscribe(() => this._applyState());
    }
    this._applyState();
  }

  _detach() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  // PUBLIC_INTERFACE
  set onEdit(callback) {
    this._onEdit = callback;
  }

  // PUBLIC_INTERFACE
  static mountTo(parent, opts = {}) {
    const comp = parent.stage.c({ type: NotesIndex, ...opts });
    parent.childList.add(comp);
    return comp;
  }

  _applyState() {
    const state = store.getState ? store.getState() : {};
    const notes = state.notes && state.notes.items ? state.notes.items : [];
    const selectedId = state.notes && state.notes.selectedId ? state.notes.selectedId : null;

    if (!notes || notes.length === 0 || !selectedId) {
      // Render EmptyState
      if (!this._emptyMounted) {
        this.children = []; // clear
        const empty = this.stage.c({ type: EmptyState });
        empty.onCreate = () => {
          // After creating, state will update via store.subscribe and this will re-render.
        };
        this.childList.add(empty);
        this._emptyMounted = true;
      }
      return;
    }

    // Find selected note
    const note = notes.find(n => n.id === selectedId) || null;

    if (!note) {
      // fallback to empty if somehow selected not found
      if (!this._emptyMounted) {
        this.children = [];
        const empty = this.stage.c({ type: EmptyState });
        this.childList.add(empty);
        this._emptyMounted = true;
      }
      return;
    }

    // We have a note; ensure main UI template is present
    if (this._emptyMounted) {
      // replace empty with content
      this.children = [];
      this.childList.add(this.stage.c({ type: lng.Component, ...NotesIndex._template() }));
      this._emptyMounted = false;
    }

    this._selectedNote = note;
    const updatedAt = this._formatDate(note.updatedAt || note.updated_at || Date.now());
    this.tag('Wrapper.Title').text.text = note.title || 'Untitled';
    this.tag('Wrapper.Meta').y = 60 + (this.tag('Wrapper.Title').text.getTextBounds().height || 44);
    this.tag('Wrapper.Meta').text.text = `Updated ${updatedAt}`;
    this.tag('Wrapper.Content').y = this.tag('Wrapper.Meta').y + 48;
    this.tag('Wrapper.Content').text.text = note.content || '';
  }

  _formatDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch (e) {
      return '';
    }
  }

  _getFocused() {
    // Focus Edit button when a note is present; otherwise focus EmptyState's button
    if (this._emptyMounted) {
      return this.childList.first; // EmptyState handles its own focus
    }
    return this.tag('Wrapper.EditBtn');
  }

  _focus() {
    if (!this._emptyMounted) {
      const btn = this.tag('Wrapper.EditBtn');
      btn.patch({ scale: 1.03 });
      btn.tag('FocusRing').patch({ alpha: 1 });
    }
  }

  _unfocus() {
    if (!this._emptyMounted) {
      const btn = this.tag('Wrapper.EditBtn');
      btn.patch({ scale: 1.0 });
      btn.tag('FocusRing').patch({ alpha: 0 });
    }
  }

  _handleEnter() {
    if (this._emptyMounted) return false;
    this._triggerEdit();
    return true;
  }

  _handleOk() {
    return this._handleEnter();
  }

  _triggerEdit() {
    // Prefer callback if provided (NotesLayout can wire this to switch views)
    if (this._onEdit) {
      this._onEdit(this._selectedNote);
      return;
    }

    // Fallback to store action if available
    const actions = store.actions || {};
    if (actions && actions.startEditing) {
      actions.startEditing(this._selectedNote?.id);
      return;
    }
    if (store.dispatch) {
      store.dispatch({ type: 'notes/startEditing', payload: this._selectedNote?.id });
    }
  }
}
