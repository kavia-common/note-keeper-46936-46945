import lng from '@lightningjs/lng';
import { theme } from '../theme';
import { store } from '../state/store';

/**
 * PUBLIC_INTERFACE
 * NoteListItem - Displays a single note in the sidebar list with selection, hover, and delete actions.
 * Props:
 * - note: { id: string|number, title: string, updatedAt?: string, preview?: string }
 * - active: boolean - whether this item is the currently selected note
 * - index: number - position index in the list for navigation
 * - onSelect: function(noteId) - optional callback when selected
 * - onDelete: function(noteId) - optional callback when delete triggered
 */
export default class NoteListItem extends lng.Component {
  static _template() {
    const colors = theme?.colors || {};
    const ocean = {
      primary: colors.primary || 0xff2563eb,
      secondary: colors.secondary || 0xfff59e0b,
      surface: colors.surface || 0xffffffff,
      text: colors.onSurface || 0xff111827,
      hover: 0x142563eb, // subtle overlay in ARGB
      activeBg: 0x0f2563eb, // more opaque
      border: 0x22111827, // faint
      error: colors.error || 0xffef4444,
    };

    return {
      w: 360,
      h: 64,
      rect: true,
      color: ocean.surface,
      shader: { type: lng.shaders.RoundedRectangle, radius: 8 },
      clipping: true,
      // background hover/active overlay
      Overlay: {
        w: w => w,
        h: h => h,
        rect: true,
        color: 0x00ffffff, // transparent by default
        shader: { type: lng.shaders.RoundedRectangle, radius: 8 },
        alpha: 1,
      },
      Content: {
        x: 12,
        y: 10,
        Title: {
          text: {
            text: '',
            textColor: ocean.text,
            fontFace: 'Regular',
            fontSize: 22,
            wordWrapWidth: 280,
            maxLines: 1,
            textOverflow: 'ellipsis',
          },
        },
        Meta: {
          y: 28,
          text: {
            text: '',
            textColor: 0xff6b7280, // gray-500
            fontFace: 'Regular',
            fontSize: 16,
            wordWrapWidth: 280,
            maxLines: 1,
            textOverflow: 'ellipsis',
          },
        },
      },
      DeleteBtn: {
        x: 320,
        y: 18,
        w: 28,
        h: 28,
        rect: true,
        color: 0x00ffffff,
        shader: { type: lng.shaders.RoundedRectangle, radius: 6 },
        // trash icon as text glyph (simple "×" if no icon font)
        Label: {
          mount: 0.5,
          x: 14,
          y: 14,
          text: {
            text: '🗑',
            fontSize: 16,
            textColor: 0xff6b7280,
          },
        },
      },
      FocusRing: {
        alpha: 0,
        w: w => w,
        h: h => h,
        rect: false,
        shader: { type: lng.shaders.RoundedRectangle, radius: 8, stroke: 2, strokeColor: ocean.primary },
      },
    };
  }

  _construct() {
    this._note = null;
    this._active = false;
    this._index = 0;
    this._hover = false;
    this._deleteHover = false;
  }

  set note(v) {
    this._note = v;
    this._updateView();
  }

  set active(v) {
    this._active = !!v;
    this._updateActive();
  }

  set index(v) {
    this._index = v;
  }

  get noteId() {
    return this._note?.id;
  }

  // PUBLIC_INTERFACE
  onSelect(noteId) {
    /** Callback fired on selection (click/enter). Defaults to dispatching store.selectNote */
    if (typeof this._onSelect === 'function') return this._onSelect(noteId);
    store.dispatch({ type: 'selectNote', payload: noteId });
  }

  set onSelectHandler(fn) {
    this._onSelect = fn;
  }

  // PUBLIC_INTERFACE
  onDelete(noteId) {
    /** Callback fired on delete. Defaults to confirm and dispatching store.deleteNote */
    if (typeof this._onDelete === 'function') return this._onDelete(noteId);
    if (!noteId) return;
    // Simple confirm via browser confirm (Lightning runs in browser)
    // eslint-disable-next-line no-restricted-globals
    const ok = window.confirm('Delete this note? This cannot be undone.');
    if (ok) {
      store.dispatch({ type: 'deleteNote', payload: noteId });
    }
  }

  set onDeleteHandler(fn) {
    this._onDelete = fn;
  }

  _init() {
    this.tag('DeleteBtn').on('txLoaded', () => {});
  }

  _focus() {
    this.tag('FocusRing').alpha = 1;
    this.patch({ smooth: { scale: 1.02, duration: 0.18 } });
    this._updateHover(true);
  }

  _unfocus() {
    this.tag('FocusRing').alpha = 0;
    this.patch({ smooth: { scale: 1.0, duration: 0.18 } });
    this._updateHover(false);
  }

  _handleEnter() {
    if (this._note?.id != null) {
      this.onSelect(this._note.id);
      return true;
    }
    return false;
  }

  _handleBack() {
    // prevent accidental back navigation if focused on item; no-op
    return false;
  }

  _updateView() {
    const title = this._note?.title || 'Untitled';
    const meta = this._formatMeta(this._note);
    this.tag('Content').tag('Title').text.text = title;
    this.tag('Content').tag('Meta').text.text = meta;
  }

  _formatMeta(note) {
    if (!note) return '';
    const updated = note.updatedAt ? this._formatTime(note.updatedAt) : '';
    const preview = (note.preview || '').trim();
    const combined = [updated, preview].filter(Boolean).join(' • ');
    return combined;
  }

  _formatTime(ts) {
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch {
      return '';
    }
  }

  _updateActive() {
    const ocean = {
      activeBg: 0x0f2563eb,
    };
    // Use background overlay intensity to indicate active
    const overlay = this.tag('Overlay');
    overlay.setSmooth('color', this._active ? ocean.activeBg : 0x00ffffff, { duration: 0.18 });

    // Title emphasis when active
    const title = this.tag('Content').tag('Title').text;
    title.fontStyle = this._active ? 'bold' : 'normal';
    this.tag('Content').tag('Title').text = title;
  }

  _updateHover(isHovering) {
    this._hover = isHovering;
    if (this._active) return; // active state wins
    // subtle hover overlay
    this.tag('Overlay').setSmooth('color', isHovering ? 0x142563eb : 0x00ffffff, { duration: 0.16 });
  }

  // Mouse interactions to support hover and click
  _enableMouse() {
    this.cursor = 'pointer';
  }

  _captureKey() {
    return false;
  }

  _handleMouseEnter() {
    this._updateHover(true);
  }

  _handleMouseLeave() {
    this._updateHover(false);
    this._toggleDeleteHover(false);
  }

  _handleMouseMove(e) {
    // Track if hovering delete area
    const local = this.core.globalToLocal(e.x, e.y);
    const isOverDelete = local.x >= 320 && local.x <= 348 && local.y >= 18 && local.y <= 46;
    this._toggleDeleteHover(isOverDelete);
  }

  _toggleDeleteHover(v) {
    if (this._deleteHover === v) return;
    this._deleteHover = v;
    const btn = this.tag('DeleteBtn');
    btn.color = v ? 0x112563eb : 0x00ffffff;
    btn.tag('Label').text.textColor = v ? 0xffef4444 : 0xff6b7280;
  }

  _handleMouseUp(e) {
    const local = this.core.globalToLocal(e.x, e.y);
    const clickedDelete = local.x >= 320 && local.x <= 348 && local.y >= 18 && local.y <= 46;
    if (clickedDelete) {
      this.onDelete(this._note?.id);
      return true;
    }
    this.onSelect(this._note?.id);
    return true;
  }
}
